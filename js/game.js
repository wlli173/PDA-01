/**
 * Renderizador e entrada do mapa. Vista 3/4 (2.5D) em pixel art: piso plano,
 * paredes com face visível, personagem e adereços ordenados por profundidade.
 * O deslocamento só pede um passo ao PDA (hooks.attempt); quem decide é a pilha.
 * Expõe window.VigiaGame.
 */
(function (root) {
  "use strict";

  const World = root.VigiaWorld;
  const Art = root.VigiaArt;

  const VIEW_W = 320;
  const VIEW_H = 192;
  const T = Art.T;
  const SPEED = 130; // pixels por segundo

  // Matriz de Bayer 4x4: o escuro é "peneirado" em degraus, nunca em degradê suave.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(function (v) {
    return (v + 0.5) / 16;
  });
  const ALPHAS = [0, 0.2, 0.42, 0.65, 0.85, 0.97];
  const LEVEL32 = ALPHAS.map(function (a) {
    return ((Math.round(a * 255) << 24) | (4 << 16) | (5 << 8) | 8) >>> 0;
  });
  const WARM32 = ((Math.round(0.13 * 255) << 24) | (60 << 16) | (170 << 8) | 255) >>> 0;

  const PULSE = {
    a: { text: "PEGAR A", color: "#ff8a3d" },
    k: { text: "PEGAR K", color: "#6fd8f0" },
    b: { text: "ABRIR -A", color: "#ffb08a" },
    d: { text: "ABRIR -K", color: "#9fe6f7" },
    e: { text: "DESCER +R", color: "#e6d3b0" },
    s: { text: "SELAR -R", color: "#9ae6bc" },
    n: { text: "GIRAR!", color: "#f2c75c" },
  };

  function create(canvas, hooks) {
    const g = canvas.getContext("2d");
    canvas.width = VIEW_W;
    canvas.height = VIEW_H;
    g.imageSmoothingEnabled = false;

    const lightCanvas = document.createElement("canvas");
    lightCanvas.width = VIEW_W;
    lightCanvas.height = VIEW_H;
    const lightCtx = lightCanvas.getContext("2d");
    const lightImg = lightCtx.createImageData(VIEW_W, VIEW_H);
    const light32 = new Uint32Array(lightImg.data.buffer);
    const light = new Float32Array(VIEW_W * VIEW_H);

    let world;
    let grid;
    let events;
    let solid;
    let doorOpen;
    let player;
    let floats;
    let sparks;
    let shakeUntil = 0;
    let fade = 1;
    let lampR = 92;
    let lastTime = 0;
    let nextSparkle = 0;

    function reset() {
      world = World.createWorld();
      grid = world.grid;
      events = world.events;
      solid = new Set(world.decor.map(function (d) { return d.x + "," + d.y; }));
      doorOpen = false;
      player = {
        x: world.spawn.x,
        y: world.spawn.y,
        vx: world.spawn.x * T,
        vy: world.spawn.y * T,
        dir: "down",
        moving: false,
      };
      floats = [];
      sparks = [];
      shakeUntil = 0;
      fade = 1;
      lampR = 92;
    }

    function isFloorish(x, y) {
      if (x < 0 || y < 0 || x >= World.COLS || y >= World.ROWS) return false;
      return grid[y][x] === World.FLOOR || grid[y][x] === World.DOOR;
    }

    function isWall(x, y) {
      return !isFloorish(x, y);
    }

    function blocked(x, y) {
      if (!isFloorish(x, y)) return true;
      if (grid[y][x] === World.DOOR && !doorOpen) return true;
      return solid.has(x + "," + y);
    }

    function teleport(x, y) {
      player.x = x;
      player.y = y;
      player.vx = x * T;
      player.vy = y * T;
      player.moving = false;
      fade = 1;
    }

    function burst(x, y, color, count) {
      const now = performance.now();
      for (let i = 0; i < count; i += 1) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.6;
        const speed = 18 + Math.random() * 26;
        sparks.push({
          x: x,
          y: y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 10,
          t0: now,
          life: 380 + Math.random() * 220,
          color: color,
        });
      }
    }

    /** Feedback visual de um passo do PDA (empilhar, desempilhar ou rejeitar). */
    function pulse(step, tx, ty) {
      if (!step || step.ignored) return;
      const now = performance.now();
      const cx = tx * T + T / 2;
      const cy = ty * T;
      if (!step.ok) {
        floats.push({ text: "X", color: "#ff6a4a", x: cx, y: cy, t0: now });
        shakeUntil = now + 420;
        burst(cx, cy + 8, "#ff6a4a", 10);
        return;
      }
      const p = PULSE[step.symbol];
      if (!p) return;
      floats.push({ text: p.text, color: p.color, x: cx, y: cy, t0: now });
      burst(cx, cy + 8, p.color, step.symbol === "n" ? 18 : 8);
    }

    function sfx(name) {
      if (root.VigiaSFX) root.VigiaSFX.play(name);
    }

    function move(dx, dy) {
      const p = hooks.presentation();
      if (p.simulating || p.accepted || p.rejected) return;
      player.dir = dx < 0 ? "left" : dx > 0 ? "right" : dy < 0 ? "up" : "down";
      const nx = player.x + dx;
      const ny = player.y + dy;
      if (blocked(nx, ny)) return;
      player.x = nx;
      player.y = ny;
      sfx("step");

      const ev = events.get(nx + "," + ny);
      if (!ev) return;
      const result = hooks.attempt(ev.symbol);
      if (!result || result.ignored) return;
      pulse(result, nx, ny);
      if (root.VigiaSFX) root.VigiaSFX.playStep(result);
      if (!result.ok) return;
      if (ev.symbol === "a" || ev.symbol === "k") events.delete(nx + "," + ny);
      if (result.from === "q0" && ev.symbol === "a") doorOpen = true;
      if (ev.landing && (ev.symbol === "e" || ev.symbol === "s")) {
        teleport(ev.landing.x, ev.landing.y);
      }
    }

    /** Modo roteiro: leva a câmera à sala do estado atual do PDA. */
    function focusState(state) {
      const spot = World.FOCUS[state];
      if (!spot) return;
      if (state !== "q0") doorOpen = true;
      if (spot.x === player.x && spot.y === player.y) return;
      if (World.zoneAt(spot.x, spot.y) === World.zoneAt(player.x, player.y)) {
        player.x = spot.x;
        player.y = spot.y;
        return;
      }
      teleport(spot.x, spot.y);
    }

    function showPulse(step) {
      pulse(step, player.x, player.y);
    }

    /* ---------- desenho ---------- */

    function drawTile(x, y, sx, sy) {
      const zone = World.zoneAt(x, y);
      if (isFloorish(x, y)) {
        g.drawImage(Art.floorTile(zone, Art.floorVariant(x, y)), sx, sy);
        if (isWall(x, y - 1)) {
          g.fillStyle = "rgba(0,0,0,0.4)";
          g.fillRect(sx, sy, T, 3);
          g.fillStyle = "rgba(0,0,0,0.2)";
          g.fillRect(sx, sy + 3, T, 1);
        }
        if (isWall(x - 1, y)) {
          g.fillStyle = "rgba(0,0,0,0.22)";
          g.fillRect(sx, sy, 2, T);
        }
        if (isWall(x + 1, y)) {
          g.fillStyle = "rgba(0,0,0,0.22)";
          g.fillRect(sx + T - 2, sy, 2, T);
        }
        return;
      }
      if (isFloorish(x, y + 1)) {
        const h = Art.hash(x, y) % 6;
        g.drawImage(Art.wallFace(zone, h < 3 ? 0 : h < 5 ? 1 : 2), sx, sy);
        return;
      }
      const n = isFloorish(x, y - 1);
      const w = isFloorish(x - 1, y);
      const e = isFloorish(x + 1, y);
      const diag =
        isFloorish(x - 1, y - 1) || isFloorish(x + 1, y - 1) || isFloorish(x - 1, y + 1) || isFloorish(x + 1, y + 1);
      if (n || w || e || diag) {
        g.drawImage(Art.wallCap(zone, Art.hash(x, y) % 2), sx, sy);
        Art.drawCapLips(g, sx, sy, zone, n, w, e);
      }
    }

    function onScreen(sx, sy, pad) {
      return sx > -pad && sy > -pad && sx < VIEW_W + pad && sy < VIEW_H + pad;
    }

    function addLight(list, x, y, r, intensity) {
      if (x + r < 0 || y + r < 0 || x - r > VIEW_W || y - r > VIEW_H) return;
      list.push({ x: x, y: y, r: r, i: intensity });
    }

    function buildLights(camX, camY, now, presentation) {
      const list = [];
      let target = 92;
      if (presentation.accepted) target = 200;
      lampR += (target - lampR) * 0.05;
      let r = lampR + Math.sin(now / 90) * 1.5 + Math.sin(now / 37);
      if (presentation.rejected) r *= 0.55 + 0.45 * (Math.floor(now / 70) % 2);
      addLight(list, player.vx + T / 2 - camX, player.vy + 6 - camY, r, 1);
      world.decor.forEach(function (d) {
        if (d.kind === "lamp") addLight(list, d.x * T + T / 2 - camX, d.y * T + 4 - camY, 66, 0.95);
      });
      events.forEach(function (ev) {
        const rad = ev.symbol === "n" ? 46 : 30;
        addLight(list, ev.x * T + T / 2 - camX, ev.y * T + T / 2 - camY, rad, 0.88);
      });
      return list;
    }

    function composeLight(list, bias) {
      light.fill(0);
      for (let s = 0; s < list.length; s += 1) {
        const L = list[s];
        const r2 = L.r * L.r;
        const x0 = Math.max(0, Math.floor(L.x - L.r));
        const x1 = Math.min(VIEW_W - 1, Math.ceil(L.x + L.r));
        const y0 = Math.max(0, Math.floor(L.y - L.r));
        const y1 = Math.min(VIEW_H - 1, Math.ceil(L.y + L.r));
        for (let y = y0; y <= y1; y += 1) {
          const dy = (y - L.y) * 1.15;
          for (let x = x0; x <= x1; x += 1) {
            const dx = x - L.x;
            const d2 = dx * dx + dy * dy;
            if (d2 >= r2) continue;
            const t = 1 - Math.sqrt(d2) / L.r;
            const b = t * t * (3 - 2 * t) * L.i;
            const idx = y * VIEW_W + x;
            if (b > light[idx]) light[idx] = b;
          }
        }
      }
      const top = LEVEL32.length - 1;
      for (let y = 0; y < VIEW_H; y += 1) {
        for (let x = 0; x < VIEW_W; x += 1) {
          const idx = y * VIEW_W + x;
          const bayer = BAYER[((y & 3) << 2) | (x & 3)];
          let dark = 1 - light[idx] + bias;
          if (dark > 1) dark = 1;
          let lvl = Math.floor(dark * top + bayer);
          if (lvl > top) lvl = top;
          if (lvl < 0) lvl = 0;
          if (lvl === 0 && light[idx] > 0.5 && bayer < (light[idx] - 0.5) * 1.3) {
            light32[idx] = WARM32;
          } else {
            light32[idx] = LEVEL32[lvl];
          }
        }
      }
      lightCtx.putImageData(lightImg, 0, 0);
      g.drawImage(lightCanvas, 0, 0);
    }

    function text(str, x, y, color, align, size) {
      g.font = (size || 8) + "px " + Art.FONT;
      g.textBaseline = "top";
      g.textAlign = align || "left";
      g.fillStyle = "#000";
      g.fillText(str, x + 1, y + 1);
      g.fillStyle = color;
      g.fillText(str, x, y);
    }

    function drawEffects(camX, camY, now) {
      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const s = sparks[i];
        const age = now - s.t0;
        if (age > s.life) {
          sparks.splice(i, 1);
          continue;
        }
        const t = age / 1000;
        const x = Math.round(s.x + s.vx * t - camX);
        const y = Math.round(s.y + s.vy * t + 30 * t * t - camY);
        g.fillStyle = s.color;
        g.fillRect(x, y, age > s.life * 0.6 ? 1 : 2, age > s.life * 0.6 ? 1 : 2);
      }
      for (let i = floats.length - 1; i >= 0; i -= 1) {
        const f = floats[i];
        const age = now - f.t0;
        if (age > 1100) {
          floats.splice(i, 1);
          continue;
        }
        const rise = Math.min(14, Math.floor(age / 55));
        const x = Math.round(f.x - camX);
        const y = Math.round(f.y - camY - 8 - rise);
        if (age > 800 && Math.floor(age / 70) % 2) continue;
        text(f.text, x, y, f.color, "center", 8);
      }
    }

    function drawChip(presentation) {
      const info = presentation.chip;
      if (!info) return;
      const line1 = "PDA  " + info.state;
      const line2 = info.name.toUpperCase();
      const line3 = "TOPO " + (info.top || "-") + "   Γ=" + info.depth;
      g.font = "8px " + Art.FONT;
      const w =
        Math.max(
          g.measureText(line1).width,
          g.measureText(line2).width,
          g.measureText(line3).width,
        ) + 14;
      const h = 40;
      g.fillStyle = "#0a0706";
      g.fillRect(4, 4, w, h);
      g.fillStyle = presentation.rejected ? "#ff6a4a" : presentation.accepted ? "#9be7b8" : "#ffb703";
      g.fillRect(4, 4, w, 2);
      g.fillStyle = "#6a5344";
      g.fillRect(4, 3 + h, w, 1);
      g.fillRect(4, 4, 1, h);
      g.fillRect(3 + w, 4, 1, h);
      text(line1, 10, 10, "#ffb703", "left", 8);
      text(line2, 10, 22, "#f0e6d8", "left", 8);
      text(line3, 10, 34, "#cbbba6", "left", 8);
    }

    function banner(label, color, big, subtitle) {
      const h = subtitle ? 42 : 30;
      g.fillStyle = "rgba(8,6,5,0.9)";
      g.fillRect(0, VIEW_H - h, VIEW_W, h);
      g.fillStyle = color;
      g.fillRect(0, VIEW_H - h, VIEW_W, 2);
      if (subtitle) {
        text(label, VIEW_W / 2, VIEW_H - 34, color, "center", big ? 12 : 8);
        text(subtitle, VIEW_W / 2, VIEW_H - 16, "#cbbba6", "center", 8);
      } else {
        text(label, VIEW_W / 2, VIEW_H - (big ? 22 : 18), color, "center", big ? 16 : 8);
      }
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
      lastTime = now;
      const presentation = hooks.presentation();

      // movimento em pixels inteiros rumo ao tile lógico
      const tx = player.x * T;
      const ty = player.y * T;
      const dx = tx - player.vx;
      const dy = ty - player.vy;
      const dist = Math.hypot(dx, dy);
      const step = SPEED * dt;
      if (dist <= step || dist === 0) {
        player.vx = tx;
        player.vy = ty;
        player.moving = false;
      } else {
        player.vx += (dx / dist) * step;
        player.vy += (dy / dist) * step;
        player.moving = true;
      }
      if (fade > 0) fade = Math.max(0, fade - dt * 3);

      if (presentation.accepted && now > nextSparkle) {
        nextSparkle = now + 70;
        const a = Math.random() * Math.PI * 2;
        burst(player.vx + T / 2 + Math.cos(a) * 22, player.vy + Math.sin(a) * 16, "#f2c75c", 4);
        burst(player.vx + T / 2, player.vy - 4, "#9be7b8", 2);
      }

      let camX = Math.round(player.vx + T / 2 - VIEW_W / 2);
      let camY = Math.round(player.vy + T / 2 - VIEW_H / 2);
      if (now < shakeUntil) {
        camX += ((Math.random() * 3) | 0) - 1;
        camY += ((Math.random() * 3) | 0) - 1;
      }

      g.fillStyle = "#070605";
      g.fillRect(0, 0, VIEW_W, VIEW_H);

      const x0 = Math.floor(camX / T);
      const x1 = Math.floor((camX + VIEW_W - 1) / T);
      const y0 = Math.floor(camY / T);
      const y1 = Math.floor((camY + VIEW_H - 1) / T);

      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) drawTile(x, y, x * T - camX, y * T - camY);
      }

      // piso: porta e eventos
      const gate = world.doorAt;
      Art.drawGate(g, gate.x * T - camX, gate.y * T - camY, doorOpen);
      let seed = 0;
      events.forEach(function (ev) {
        seed += 1;
        const sx = ev.x * T - camX;
        const sy = ev.y * T - camY;
        if (onScreen(sx, sy, T * 2)) Art.drawEvent(g, ev.symbol, sx, sy, now, seed);
      });

      // camada com profundidade: adereços e o Vigia
      const layer = [];
      world.decor.forEach(function (d) {
        layer.push({ base: d.y * T + T, kind: "prop", d: d });
      });
      layer.push({ base: player.vy + T + 0.5, kind: "player" });
      layer.sort(function (a, b) { return a.base - b.base; });
      layer.forEach(function (item) {
        if (item.kind === "prop") {
          const sx = item.d.x * T - camX;
          const sy = item.d.y * T - camY;
          if (onScreen(sx, sy, T * 2)) Art.drawProp(g, item.d.kind, sx, sy, now);
        } else {
          const frameIdx = player.moving ? Math.floor(now / 110) % 2 : 0;
          const bob = player.moving ? 0 : Math.floor(now / 520) % 2;
          g.drawImage(
            Art.vigia(player.dir, frameIdx),
            Math.round(player.vx - camX),
            Math.round(player.vy - camY) - 6 - bob,
          );
        }
      });

      // etiquetas: letra formal + verbo da ação
      const actionMap = root.VigiaPDA && root.VigiaPDA.SYMBOL_ACTION;
      events.forEach(function (ev) {
        const sx = ev.x * T - camX;
        const sy = ev.y * T - camY;
        if (onScreen(sx, sy, T * 2)) Art.drawTag(g, ev.symbol, sx, sy - 1, actionMap);
      });

      composeLight(buildLights(camX, camY, now, presentation), fade * 0.9);

      if (presentation.rejected) {
        g.fillStyle = "rgba(120,20,10,0.28)";
        g.fillRect(0, 0, VIEW_W, VIEW_H);
        if (Math.floor(now / 90) % 2 === 0) {
          g.fillStyle = "rgba(255,80,40,0.08)";
          g.fillRect(0, 0, VIEW_W, VIEW_H);
        }
      } else if (presentation.accepted) {
        g.fillStyle = "rgba(40,120,70,0.12)";
        g.fillRect(0, 0, VIEW_W, VIEW_H);
      }

      drawEffects(camX, camY, now);
      drawChip(presentation);

      const end = presentation.ending;
      if (presentation.rejected) {
        banner(
          end && end.title ? end.title : "REJEITADA",
          "#ff6a4a",
          true,
          end && end.subtitle ? end.subtitle : "Servos travados · R para reiniciar",
        );
      } else if (presentation.accepted) {
        banner(
          end && end.title ? end.title : "CALDEIRA ALIVIADA",
          "#9be7b8",
          true,
          end && end.subtitle ? end.subtitle : "Cadeia aceita em q5",
        );
      } else if (presentation.simulating) {
        banner("SIMULANDO ROTEIRO", "#ffb703", false);
      }

      root.requestAnimationFrame(frame);
    }

    function fit() {
      const stage = canvas.parentElement;
      if (!stage) return;
      const box = stage.getBoundingClientRect();
      const byWidth = Math.floor((box.width - 16) / VIEW_W);
      const byHeight = Math.floor((root.innerHeight - 150) / VIEW_H);
      const scale = Math.max(1, Math.min(4, byWidth, Math.max(1, byHeight)));
      const w = VIEW_W * scale + "px";
      const h = VIEW_H * scale + "px";
      if (canvas.style.width !== w) canvas.style.width = w;
      if (canvas.style.height !== h) canvas.style.height = h;
    }

    reset();
    fit();
    if (root.ResizeObserver && canvas.parentElement) {
      new root.ResizeObserver(fit).observe(canvas.parentElement);
    }
    root.addEventListener("resize", fit);
    root.requestAnimationFrame(frame);

    return { reset: reset, move: move, fit: fit, focusState: focusState, pulse: showPulse };
  }

  root.VigiaGame = { create: create, VIEW_W: VIEW_W, VIEW_H: VIEW_H };
})(window);
