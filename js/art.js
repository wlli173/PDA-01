/**
 * Arte em pixel da Usina 7, toda gerada por código (sem imagens externas).
 * Tudo é desenhado em múltiplos de 1px num canvas de 320x192 e ampliado por
 * número inteiro no CSS (image-rendering: pixelated).
 * Expõe window.VigiaArt.
 */
(function (root) {
  "use strict";

  const T = 16;

  const ZONE = {
    dock: {
      f0: "#26201a", f1: "#302922", f2: "#1b1713", seam: "#100d0b", hi: "#352d25", crack: "#0c0907",
      a: "#4a3b30", b: "#3f3229", dark: "#251c16", lip: "#8a7059", lip2: "#5e4a3a", rivet: "#7a6552",
      cap: "#14110e", capSpeck: "#1d1813",
    },
    gallery: {
      f0: "#2e2219", f1: "#3a2b20", f2: "#20170f", seam: "#120c08", hi: "#403023", crack: "#0e0805",
      a: "#5a4232", b: "#4d392b", dark: "#2a1d14", lip: "#a07a52", lip2: "#6c4f38", rivet: "#8a6c50",
      cap: "#18110b", capSpeck: "#221810",
    },
    ring1: {
      f0: "#321a16", f1: "#432219", f2: "#22110e", seam: "#140806", hi: "#4a2a20", crack: "#7a2a18",
      a: "#5c3328", b: "#4f2b22", dark: "#2a1410", lip: "#a8604c", lip2: "#6d3a2e", rivet: "#8f5a48",
      cap: "#1a0c09", capSpeck: "#26120d",
    },
    ring2: {
      f0: "#14221d", f1: "#1c3128", f2: "#0d1713", seam: "#070d0a", hi: "#24382f", crack: "#2c6a4a",
      a: "#2f4a40", b: "#283f36", dark: "#121f1a", lip: "#6fa08a", lip2: "#3f6454", rivet: "#5f8c78",
      cap: "#09120e", capSpeck: "#0f1c16",
    },
    ring3: {
      f0: "#2a1210", f1: "#3b1815", f2: "#1c0b0a", seam: "#0e0505", hi: "#44201c", crack: "#c2381f",
      a: "#522420", b: "#461e1b", dark: "#240c0a", lip: "#a85850", lip2: "#6a3430", rivet: "#8a4a44",
      cap: "#170707", capSpeck: "#240c0b",
    },
  };

  const COLOR = {
    a: "#ff8a3d", k: "#6fd8f0", b: "#e85d04", d: "#3aa9c8", e: "#e6d3b0", s: "#6fcf9a", n: "#f2c75c",
  };
  const COLOR_DARK = {
    a: "#7a3510", k: "#1f6f84", b: "#6a2a02", d: "#164c5e", e: "#7a6a4c", s: "#2c6a4a", n: "#7a5f1a",
  };

  const INK = "#0a0706";
  const SODIUM = "#ffb703";
  const FONT = '"Press Start 2P", "Courier New", monospace';

  const cache = new Map();

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function rect(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  }

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function hash(x, y) {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177) >>> 0;
    return (n ^ (n >>> 16)) >>> 0;
  }

  function cached(key, w, h, draw) {
    let c = cache.get(key);
    if (!c) {
      c = canvas(w, h);
      draw(c.getContext("2d"));
      cache.set(key, c);
    }
    return c;
  }

  /* ---------- piso ---------- */

  function floorTile(zone, v) {
    return cached("f:" + zone + ":" + v, T, T, function (g) {
      const Z = ZONE[zone];
      const r = rng(7919 * (v + 3) + zone.length * 131 + zone.charCodeAt(zone.length - 1));
      rect(g, 0, 0, T, T, Z.f0);
      for (let i = 0; i < 26; i += 1) {
        rect(g, (r() * T) | 0, (r() * T) | 0, 1, 1, r() < 0.5 ? Z.f1 : Z.f2);
      }
      rect(g, 0, 0, T - 1, 1, Z.hi);
      rect(g, 0, 1, 1, T - 2, Z.hi);
      rect(g, T - 1, 0, 1, T, Z.seam);
      rect(g, 0, T - 1, T, 1, Z.seam);
      if (v === 0) {
        rect(g, 2, 2, 1, 1, Z.hi);
        rect(g, 12, 12, 1, 1, Z.hi);
      } else if (v === 1) {
        rect(g, 3, 3, 10, 10, Z.f2);
        for (let i = 0; i < 5; i += 1) rect(g, 4 + i * 2, 4, 1, 8, Z.seam);
        rect(g, 3, 3, 10, 1, Z.hi);
      } else if (v === 2) {
        rect(g, 4, 6, 7, 3, Z.f2);
        rect(g, 5, 5, 4, 1, Z.f2);
        rect(g, 6, 9, 3, 1, Z.f2);
        rect(g, 6, 7, 2, 1, Z.f1);
      } else {
        rect(g, 3, 2, 1, 2, Z.crack);
        rect(g, 4, 4, 1, 2, Z.crack);
        rect(g, 5, 6, 2, 1, Z.crack);
        rect(g, 7, 7, 1, 3, Z.crack);
        rect(g, 8, 10, 2, 1, Z.crack);
        rect(g, 10, 11, 1, 3, Z.crack);
      }
    });
  }

  function floorVariant(x, y) {
    const h = hash(x, y) % 20;
    if (h < 11) return 0;
    if (h < 13) return 1;
    if (h < 17) return 2;
    return 3;
  }

  /* ---------- parede ---------- */

  function wallFace(zone, v) {
    return cached("w:" + zone + ":" + v, T, T, function (g) {
      const Z = ZONE[zone];
      const r = rng(104729 * (v + 2) + zone.charCodeAt(zone.length - 1));
      rect(g, 0, 0, T, T, Z.a);
      for (let i = 0; i < 16; i += 1) {
        rect(g, (r() * T) | 0, 2 + ((r() * 10) | 0), 1, 1, r() < 0.55 ? Z.b : Z.dark);
      }
      rect(g, 7, 2, 1, 11, Z.dark);
      rect(g, 15, 2, 1, 11, Z.dark);
      rect(g, 8, 2, 1, 11, Z.b);
      rect(g, 0, 2, T, 1, Z.b);
      rect(g, 0, 0, T, 1, Z.lip);
      rect(g, 0, 1, T, 1, Z.lip2);
      rect(g, 2, 4, 1, 1, Z.rivet);
      rect(g, 11, 4, 1, 1, Z.rivet);
      rect(g, 2, 10, 1, 1, Z.rivet);
      rect(g, 11, 10, 1, 1, Z.rivet);
      if (v === 1) {
        rect(g, 0, 5, T, 4, "#59605e");
        rect(g, 0, 5, T, 1, "#8a9391");
        rect(g, 0, 8, T, 1, "#2d3231");
        rect(g, 0, 4, 2, 6, "#3a403e");
        rect(g, 14, 4, 2, 6, "#3a403e");
        rect(g, 6, 4, 2, 6, "#3a403e");
      } else if (v === 2) {
        rect(g, 3, 4, 10, 7, Z.dark);
        for (let i = 0; i < 4; i += 1) rect(g, 4, 5 + i * 2, 8, 1, Z.a);
        rect(g, 3, 4, 10, 1, Z.lip2);
      }
      rect(g, 0, 13, T, 1, Z.b);
      rect(g, 0, 14, T, 2, Z.dark);
    });
  }

  function wallCap(zone, v) {
    return cached("c:" + zone + ":" + v, T, T, function (g) {
      const Z = ZONE[zone];
      const r = rng(15485863 * (v + 1) + zone.charCodeAt(zone.length - 1));
      rect(g, 0, 0, T, T, Z.cap);
      for (let i = 0; i < 14; i += 1) rect(g, (r() * T) | 0, (r() * T) | 0, 1, 1, Z.capSpeck);
      if (v === 1) {
        rect(g, 0, 7, T, 1, Z.capSpeck);
        rect(g, 7, 0, 1, T, Z.capSpeck);
      }
    });
  }

  /** Realces nas bordas de um topo de parede que encosta no piso. */
  function drawCapLips(g, x, y, zone, north, west, east) {
    const Z = ZONE[zone];
    if (north) {
      rect(g, x, y, T, 1, Z.lip);
      rect(g, x, y + 1, T, 1, Z.lip2);
    }
    if (west) {
      rect(g, x, y, 1, T, Z.lip);
      rect(g, x + 1, y, 1, T, Z.lip2);
    }
    if (east) {
      rect(g, x + T - 1, y, 1, T, Z.lip);
      rect(g, x + T - 2, y, 1, T, Z.lip2);
    }
  }

  /* ---------- Vigia ---------- */

  function drawVigiaRaw(g, dir, frame) {
    const steel = "#8c9498";
    const light = "#c9d1d4";
    const dark = "#4a5156";
    const tread = "#2a2e30";
    const rust = "#a8431f";
    const lift = frame ? 1 : 0;

    rect(g, 3, 19, 10, 1, "rgba(0,0,0,0.45)");
    rect(g, 2, 20 - 1, 12, 1, "rgba(0,0,0,0.25)");

    if (dir === "down" || dir === "up") {
      const back = dir === "up";
      // pernas
      rect(g, 3, 16, 4, 3 - lift, tread);
      rect(g, 9, 16, 4, 2 + lift, tread);
      rect(g, 3, 16, 4, 1, dark);
      rect(g, 9, 16, 4, 1, dark);
      // braços
      rect(g, 1, 10 + lift, 2, 5, dark);
      rect(g, 13, 10 + (1 - lift), 2, 5, dark);
      rect(g, 1, 10 + lift, 2, 1, light);
      rect(g, 13, 10 + (1 - lift), 2, 1, light);
      // corpo
      rect(g, 2, 9, 12, 8, INK);
      rect(g, 3, 10, 10, 6, steel);
      rect(g, 3, 10, 10, 1, light);
      rect(g, 3, 15, 10, 1, dark);
      if (back) {
        rect(g, 5, 11, 6, 4, rust);
        rect(g, 5, 11, 6, 1, "#c8603a");
        rect(g, 6, 13, 4, 1, "#6a2810");
      } else {
        rect(g, 5, 11, 6, 3, dark);
        rect(g, 6, 12, 1, 1, rust);
        rect(g, 8, 12, 1, 1, "#6fcf9a");
        rect(g, 10, 12, 1, 1, SODIUM);
      }
      // cabeça
      rect(g, 3, 2, 10, 8, INK);
      rect(g, 4, 3, 8, 6, steel);
      rect(g, 4, 3, 8, 1, light);
      rect(g, 4, 8, 8, 1, dark);
      if (back) {
        rect(g, 6, 5, 4, 2, dark);
      } else {
        rect(g, 5, 5, 6, 2, "#1a120a");
        rect(g, 6, 5, 2, 2, SODIUM);
        rect(g, 9, 5, 2, 2, SODIUM);
        rect(g, 6, 5, 1, 1, "#fff1c9");
        rect(g, 9, 5, 1, 1, "#fff1c9");
      }
      rect(g, 8, 0, 1, 3, "#6a5344");
      rect(g, 8, 0, 1, 1, SODIUM);
      rect(g, 7, 9, 2, 1, dark);
      return;
    }

    // lado (direita); a esquerda é espelhada na hora de desenhar
    rect(g, 5, 16, 3, 3 - lift, tread);
    rect(g, 8, 16, 3, 2 + lift, tread);
    rect(g, 5, 16, 3, 1, dark);
    rect(g, 8, 16, 3, 1, dark);
    rect(g, 4, 9, 9, 8, INK);
    rect(g, 5, 10, 7, 6, steel);
    rect(g, 5, 10, 7, 1, light);
    rect(g, 5, 15, 7, 1, dark);
    rect(g, 5, 11, 2, 4, rust);
    rect(g, 7, 10 + lift, 2, 5, dark);
    rect(g, 7, 10 + lift, 2, 1, light);
    rect(g, 4, 2, 9, 8, INK);
    rect(g, 5, 3, 7, 6, steel);
    rect(g, 5, 3, 7, 1, light);
    rect(g, 5, 8, 7, 1, dark);
    rect(g, 9, 5, 3, 2, "#1a120a");
    rect(g, 10, 5, 2, 2, SODIUM);
    rect(g, 10, 5, 1, 1, "#fff1c9");
    rect(g, 7, 0, 1, 3, "#6a5344");
    rect(g, 7, 0, 1, 1, SODIUM);
  }

  /** Quadro do Vigia (16x20), com espelhamento para a esquerda. */
  function vigia(dir, frame) {
    return cached("v:" + dir + ":" + frame, T, 20, function (g) {
      if (dir === "left") {
        g.translate(T, 0);
        g.scale(-1, 1);
        drawVigiaRaw(g, "right", frame);
      } else {
        drawVigiaRaw(g, dir, frame);
      }
    });
  }

  /* ---------- eventos (ações do roteiro) ---------- */

  function circle(g, cx, cy, r0, r1, color) {
    for (let dy = -r1; dy <= r1; dy += 1) {
      for (let dx = -r1; dx <= r1; dx += 1) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= r0 && d <= r1) rect(g, cx + dx, cy + dy, 1, 1, color);
      }
    }
  }

  /** Cartucho de lacre + garra: ação de PEGAR (empilha A/K). */
  function cartridgePickup(g, x, y, base, hi, dark, hot) {
    rect(g, x + 4, y + 14, 8, 1, "rgba(0,0,0,0.45)");
    rect(g, x + 5, y + 1, 2, 3, "#6a7276");
    rect(g, x + 9, y + 1, 2, 3, "#6a7276");
    rect(g, x + 4, y + 3, 3, 2, "#8c9498");
    rect(g, x + 9, y + 3, 3, 2, "#8c9498");
    rect(g, x + 7, y + 0, 2, 2, "#4a5156");
    rect(g, x + 4, y + 5, 8, 9, INK);
    rect(g, x + 5, y + 6, 6, 7, base);
    rect(g, x + 5, y + 6, 6, 1, hi);
    rect(g, x + 5, y + 11, 6, 2, dark);
    rect(g, x + 6, y + 8, 4, 2, INK);
    rect(g, x + 7, y + 8, 2, 2, hot ? "#ffd2a8" : "#d8f7ff");
    rect(g, x + 6, y + 13, 1, 1, hi);
    rect(g, x + 9, y + 13, 1, 1, hi);
  }

  /** Comporta trancada com soquete A/K: ação de ABRIR (gasta o topo). */
  function lockedHatch(g, x, y, base, dark, on, needA) {
    rect(g, x + 1, y + 1, 14, 14, INK);
    rect(g, x + 2, y + 2, 12, 12, "#2a2624");
    rect(g, x + 3, y + 3, 4, 9, "#3d3a38");
    rect(g, x + 9, y + 3, 4, 9, "#3d3a38");
    rect(g, x + 7, y + 3, 2, 9, INK);
    rect(g, x + 3, y + 3, 4, 1, "#59544f");
    rect(g, x + 9, y + 3, 4, 1, "#59544f");
    rect(g, x + 5, y + 6, 6, 5, INK);
    rect(g, x + 6, y + 7, 4, 3, dark);
    rect(g, x + 7, y + 8, 2, 1, on ? base : "#1a1816");
    const lamp = on ? base : dark;
    rect(g, x + 3, y + 2, 2, 2, lamp);
    rect(g, x + 11, y + 2, 2, 2, lamp);
    rect(g, x + 6, y + 12, 4, 2, needA ? "#c47a3a" : "#3aa9c8");
    rect(g, x + 7, y + 12, 2, 1, needA ? "#ffb08a" : "#9fe6f7");
  }

  /** Poço com seta para baixo: ação de DESCER (empilha R). */
  function descentShaft(g, x, y, blink) {
    rect(g, x + 1, y + 1, 14, 14, INK);
    rect(g, x + 2, y + 2, 12, 12, "#6a6254");
    rect(g, x + 3, y + 3, 10, 10, "#050303");
    rect(g, x + 5, y + 3, 1, 10, "#8a7a5c");
    rect(g, x + 10, y + 3, 1, 10, "#8a7a5c");
    for (let i = 0; i < 4; i += 1) rect(g, x + 5, y + 4 + i * 2, 6, 1, "#a8956a");
    const tip = blink ? "#fff1c9" : "#e6d3b0";
    rect(g, x + 7, y + 5, 2, 4, tip);
    rect(g, x + 6, y + 8, 4, 1, tip);
    rect(g, x + 5, y + 9, 6, 1, tip);
    rect(g, x + 6, y + 10, 4, 1, tip);
    rect(g, x + 7, y + 11, 2, 1, tip);
  }

  /** Prensa de selagem + seta subir: ação de SELAR (desempilha R). */
  function sealPress(g, x, y, on) {
    rect(g, x + 1, y + 1, 14, 14, INK);
    rect(g, x + 2, y + 2, 12, 12, "#1e3a2c");
    rect(g, x + 4, y + 3, 8, 3, on ? "#6fcf9a" : "#3a8a62");
    rect(g, x + 5, y + 4, 6, 1, "#d8ffe9");
    rect(g, x + 6, y + 6, 4, 2, "#153826");
    rect(g, x + 3, y + 8, 10, 3, "#2c6a4a");
    rect(g, x + 4, y + 9, 8, 1, "#6fcf9a");
    const tip = on ? "#d8ffe9" : "#6fcf9a";
    rect(g, x + 7, y + 12, 2, 1, tip);
    rect(g, x + 6, y + 11, 4, 1, tip);
    rect(g, x + 5, y + 10, 6, 1, tip);
  }

  /** Volante + manômetro: ação de GIRAR a válvula. */
  function reliefValve(g, x, y, on) {
    rect(g, x, y + 7, T, 4, "#4e5856");
    rect(g, x, y + 7, T, 1, "#8a9391");
    rect(g, x, y + 10, T, 1, "#262c2a");
    rect(g, x, y + 6, 2, 6, "#343b39");
    rect(g, x + 14, y + 6, 2, 6, "#343b39");
    rect(g, x + 1, y + 1, 5, 5, INK);
    rect(g, x + 2, y + 2, 3, 3, "#1a2220");
    rect(g, x + 3, y + 3, 1, 1, on ? "#6fcf9a" : "#c2381f");
    circle(g, x + 9, y + 6, 3, 6, INK);
    circle(g, x + 9, y + 6, 4, 5, "#c79a2f");
    rect(g, x + 8, y + 1, 2, 11, "#f2c75c");
    rect(g, x + 4, y + 5, 10, 2, "#f2c75c");
    rect(g, x + 7, y + 4, 4, 4, "#8a6a1a");
    rect(g, x + 8, y + 5, 2, 2, on ? "#fff1c9" : "#f2c75c");
  }

  function pad(g, x, y, color, on) {
    rect(g, x + 1, y + 1, 14, 14, "#0c0908");
    rect(g, x + 2, y + 2, 12, 12, "#171210");
    const c = on ? color : COLOR_DARK_FALLBACK(color);
    rect(g, x + 1, y + 1, 3, 1, c);
    rect(g, x + 1, y + 1, 1, 3, c);
    rect(g, x + 12, y + 1, 3, 1, c);
    rect(g, x + 14, y + 1, 1, 3, c);
    rect(g, x + 1, y + 14, 3, 1, c);
    rect(g, x + 1, y + 12, 1, 3, c);
    rect(g, x + 12, y + 14, 3, 1, c);
    rect(g, x + 14, y + 12, 1, 3, c);
  }

  function COLOR_DARK_FALLBACK(color) {
    for (const k in COLOR) if (COLOR[k] === color) return COLOR_DARK[k];
    return color;
  }

  /** Desenha a ação do símbolo na célula cujo canto superior esquerdo é (x, y). */
  function drawEvent(g, symbol, x, y, now, seed) {
    const on = Math.floor(now / 380 + seed) % 2 === 0;
    const col = COLOR[symbol];
    const dark = COLOR_DARK[symbol];
    const bob = Math.round(Math.sin(now / 300 + seed));
    if (symbol === "a" || symbol === "k") {
      pad(g, x, y, col, on);
      cartridgePickup(
        g,
        x,
        y - 1 + bob,
        col,
        symbol === "a" ? "#ffd2a8" : "#d8f7ff",
        dark,
        symbol === "a",
      );
    } else if (symbol === "b" || symbol === "d") {
      pad(g, x, y, col, on);
      lockedHatch(g, x, y, col, dark, on, symbol === "b");
    } else if (symbol === "e") {
      descentShaft(g, x, y, on);
    } else if (symbol === "s") {
      sealPress(g, x, y, on);
    } else if (symbol === "n") {
      pad(g, x, y, col, on);
      reliefValve(g, x, y - 1, on);
    }
  }

  /**
   * Etiqueta: letra formal + verbo da ação (PEGAR / ABRIR / …).
   * actionMap opcional; se omitido, só mostra a letra.
   */
  function drawTag(g, symbol, x, y, actionMap) {
    const col = COLOR[symbol];
    const action = actionMap && actionMap[symbol] ? actionMap[symbol] : null;
    const tagH = action ? 17 : 11;
    const tagW = action ? 28 : 12;
    const left = x + Math.floor((T - tagW) / 2);
    rect(g, left, y - tagH, tagW, tagH, INK);
    rect(g, left + 1, y - tagH + 1, tagW - 2, tagH - 2, COLOR_DARK[symbol]);
    rect(g, left + 1, y - tagH + 1, tagW - 2, 1, col);
    g.font = "8px " + FONT;
    g.textBaseline = "top";
    g.textAlign = "center";
    const cx = left + Math.floor(tagW / 2);
    g.fillStyle = INK;
    g.fillText(symbol, cx + 1, y - tagH + 3);
    g.fillStyle = "#fff6e6";
    g.fillText(symbol, cx, y - tagH + 2);
    if (action) {
      g.font = "6px " + FONT;
      g.fillStyle = INK;
      g.fillText(action, cx + 1, y - 7);
      g.fillStyle = col;
      g.fillText(action, cx, y - 8);
    }
  }

  /* ---------- adereços ---------- */

  function drawProp(g, kind, x, y, now) {
    if (kind === "lamp") {
      rect(g, x + 7, y + 3, 2, 12, "#3a2c22");
      rect(g, x + 5, y + 14, 6, 2, "#241a14");
      rect(g, x + 4, y - 2, 8, 6, INK);
      rect(g, x + 5, y - 1, 6, 4, SODIUM);
      rect(g, x + 6, y, 4, 2, "#fff1c9");
      rect(g, x + 3, y + 4, 10, 1, "#5a4030");
    } else if (kind === "crate") {
      rect(g, x + 1, y + 3, 14, 13, INK);
      rect(g, x + 2, y + 4, 12, 11, "#6a4a2c");
      rect(g, x + 2, y + 4, 12, 2, "#8a6240");
      rect(g, x + 2, y + 13, 12, 2, "#4a321e");
      rect(g, x + 7, y + 4, 2, 11, "#3a2818");
      rect(g, x + 2, y + 9, 12, 1, "#3a2818");
      rect(g, x + 3, y + 5, 1, 1, "#b88a58");
      rect(g, x + 12, y + 5, 1, 1, "#b88a58");
    } else if (kind === "barrel") {
      rect(g, x + 3, y + 1, 10, 15, INK);
      rect(g, x + 4, y + 2, 8, 13, "#4a3424");
      rect(g, x + 4, y + 2, 8, 2, "#6a4c34");
      rect(g, x + 4, y + 5, 8, 1, "#2a1c14");
      rect(g, x + 4, y + 11, 8, 1, "#2a1c14");
      rect(g, x + 5, y + 7, 2, 3, "#c2381f");
      rect(g, x + 8, y + 7, 3, 1, "#c2381f");
      rect(g, x + 4, y + 13, 8, 2, "#2a1c14");
    } else if (kind === "pipe") {
      rect(g, x, y + 7, T, 4, INK);
      rect(g, x, y + 8, T, 3, "#4e5856");
      rect(g, x, y + 8, T, 1, "#8a9391");
      rect(g, x + 10, y + 4, 4, 12, INK);
      rect(g, x + 11, y + 5, 2, 11, "#4e5856");
      rect(g, x + 11, y + 5, 1, 11, "#8a9391");
      rect(g, x + 9, y + 7, 6, 2, "#343b39");
      const puff = Math.floor(now / 260) % 3;
      rect(g, x + 11, y + 2 - puff, 2, 2, "rgba(190,200,196,0.75)");
      rect(g, x + 12, y - puff, 1, 1, "rgba(190,200,196,0.45)");
    }
  }

  function drawGate(g, x, y, open) {
    rect(g, x, y, 3, T, "#3a2c22");
    rect(g, x + 13, y, 3, T, "#3a2c22");
    rect(g, x, y, 1, T, "#6a5344");
    rect(g, x + 15, y, 1, T, "#6a5344");
    if (open) {
      rect(g, x + 3, y + 1, 2, 3, "#59544f");
      rect(g, x + 11, y + 1, 2, 3, "#59544f");
      rect(g, x + 4, y + 2, 1, 1, "#6fcf9a");
      return;
    }
    for (let i = 0; i < 4; i += 1) {
      rect(g, x + 4 + i * 3, y + 1, 2, 14, INK);
      rect(g, x + 4 + i * 3, y + 1, 1, 14, "#8a7a62");
    }
    rect(g, x + 3, y + 3, 10, 2, "#c47a3a");
    rect(g, x + 3, y + 10, 10, 2, "#c47a3a");
    rect(g, x + 3, y + 3, 10, 1, "#e8a060");
  }

  root.VigiaArt = {
    T,
    ZONE,
    COLOR,
    COLOR_DARK,
    INK,
    SODIUM,
    FONT,
    hash,
    floorTile,
    floorVariant,
    wallFace,
    wallCap,
    drawCapLips,
    vigia,
    drawEvent,
    drawTag,
    drawProp,
    drawGate,
  };
})(window);
