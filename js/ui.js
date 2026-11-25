/**
 * Ligação entre o PDA, o mapa e o painel. Script clássico (sem módulos).
 * Depende de VigiaPDA e VigiaGame já carregados.
 */
(function () {
  "use strict";

  const PDA = window.VigiaPDA;
  const Game = window.VigiaGame;
  const SFX = window.VigiaSFX;
  if (!PDA || !Game) {
    console.error("Vigia-7: carregue pda.js e game.js antes de ui.js.");
    return;
  }

  const estadoEl = document.querySelector("#estado");
  const estadoNomeEl = document.querySelector("#estado-nome");
  const simboloEl = document.querySelector("#simbolo");
  const simboloDescEl = document.querySelector("#simbolo-desc");
  const vereditoEl = document.querySelector("#veredito");
  const vereditoDetalheEl = document.querySelector("#veredito-detalhe");
  const pilhaEl = document.querySelector("#pilha");
  const roteiroEl = document.querySelector("#roteiro");
  const registroEl = document.querySelector("#registro");
  const fimEl = document.querySelector("#fim");
  const dicaTituloEl = document.querySelector("#dica-titulo");
  const dicaEl = document.querySelector("#dica");
  const gestosEl = document.querySelector("#gestos");
  const deltaEl = document.querySelector("#delta");
  const deltaPlainEl = document.querySelector("#delta-plain");
  const form = document.querySelector("#roteiro-form");
  const input = document.querySelector("#roteiro-input");
  const velocidadeEl = document.querySelector("#velocidade");
  const exemplosEl = document.querySelector("#exemplos");
  const reiniciarEl = document.querySelector("#reiniciar");
  const muteEl = document.querySelector("#mute");
  const srStatusEl = document.querySelector("#sr-status");
  const legendaEl = document.querySelector("#legenda");
  const nodes = document.querySelectorAll("#diagrama [data-state]");
  const edges = document.querySelectorAll("#diagrama [data-edge]");
  const sideEl = document.querySelector(".side");

  let config = PDA.createConfig();
  let lastStep = null;
  let log = [];
  let mode = "play";
  let anim = 0;
  const held = new Set();
  let lastKey = null;
  let nextRepeat = 0;

  const DIRS = {
    w: [0, -1],
    a: [-1, 0],
    s: [0, 1],
    d: [1, 0],
    arrowup: [0, -1],
    arrowleft: [-1, 0],
    arrowdown: [0, 1],
    arrowright: [1, 0],
  };

  function typingTarget(target) {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    );
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch];
    });
  }

  function delayMs() {
    const n = Number(velocidadeEl && velocidadeEl.value);
    return Number.isFinite(n) && n > 0 ? n : 520;
  }

  function withScrollLock(fn) {
    const sideTop = sideEl ? sideEl.scrollTop : 0;
    const pageX = window.scrollX;
    const pageY = window.scrollY;
    fn();
    if (sideEl) sideEl.scrollTop = sideTop;
    window.scrollTo(pageX, pageY);
  }

  function attempt(symbol) {
    if (config.halted || mode !== "play") return { ignored: true };
    const step = PDA.applyStep(config, symbol);
    config = step.config;
    lastStep = step;
    if (!step.ignored) log.push(step);
    if (step.ok && step.to === "q5") {
      config = PDA.finish(config);
      mode = "ended";
      if (SFX) SFX.play("accept");
    } else if (!step.ok && !step.ignored) {
      mode = "ended";
    }
    render();
    return step;
  }

  function chipInfo() {
    const info = PDA.STATE_INFO[config.state] || { name: "?" };
    return {
      state: config.state,
      name: info.name,
      top: PDA.topOf(config) || "-",
      depth: config.stack.length,
    };
  }

  const game = Game.create(document.querySelector("#game"), {
    attempt: attempt,
    presentation: function () {
      return {
        simulating: mode === "sim",
        accepted: config.accepted,
        rejected: config.rejected,
        chip: chipInfo(),
      };
    },
  });

  function stopAnim() {
    if (anim) window.clearTimeout(anim);
    anim = 0;
  }

  function resetAll() {
    stopAnim();
    config = PDA.createConfig();
    lastStep = null;
    log = [];
    mode = "play";
    game.reset();
    if (SFX) SFX.play("reset");
    render();
  }

  function syncMuteButton() {
    if (!muteEl || !SFX) return;
    const off = SFX.isMuted();
    muteEl.setAttribute("aria-pressed", off ? "true" : "false");
    muteEl.textContent = off ? "Som: off" : "Som: on";
    muteEl.title = off ? "Ativar sons" : "Desativar sons";
  }

  function verdictDetail() {
    if (!config.halted) {
      if (!config.roteiro) return "ainda sem símbolos";
      return "topo " + (PDA.topOf(config) || "∅");
    }
    if (config.accepted) return "válvula acionada · q5";
    if (config.reason === "not-final") {
      return "entrada esgotada em " + config.state;
    }
    if (config.reason === "invalid-symbol") {
      return "símbolo inválido: " + config.symbol;
    }
    return "transição indefinida · qR";
  }

  function renderStack() {
    const top = PDA.topOf(config);
    const fromTop = config.stack.slice().reverse();
    pilhaEl.replaceChildren();
    fromTop.forEach(function (plate, index) {
      const el = document.createElement("div");
      const depth = plate === "Z" ? "fundo" : index === 0 ? "top" : "mid";
      el.className = "plate plate-" + plate + " " + depth + (index === 0 ? " is-top" : "");
      const label = document.createTextNode(plate);
      el.appendChild(label);
      if (index === 0 || plate === "Z") {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = plate === "Z" ? "fundo" : "topo";
        el.appendChild(tag);
      }
      pilhaEl.appendChild(el);
    });
    pilhaEl.setAttribute(
      "aria-label",
      "Pilha, topo " + (top || "vazio") + ": " + fromTop.join(", "),
    );
  }

  function renderTape() {
    roteiroEl.replaceChildren();
    if (!config.roteiro) {
      const empty = document.createElement("span");
      empty.className = "empty";
      empty.textContent = "—";
      roteiroEl.appendChild(empty);
      return;
    }
    Array.prototype.forEach.call(config.roteiro, function (ch, index) {
      const cell = document.createElement("span");
      cell.className = "cell";
      if (config.failIndex === index) cell.className += " bad";
      else if (config.accepted && index === config.roteiro.length - 1) cell.className += " good";
      else if (index === config.roteiro.length - 1 && !config.halted) cell.className += " now";
      else if (index === config.roteiro.length - 1) cell.className += " now";
      cell.textContent = ch;
      roteiroEl.appendChild(cell);
      if (index < config.roteiro.length - 1) {
        roteiroEl.appendChild(document.createTextNode(" "));
      }
    });
  }

  function renderLog() {
    registroEl.replaceChildren();
    const start = Math.max(0, log.length - 12);
    for (let i = start; i < log.length; i += 1) {
      const step = log[i];
      const li = document.createElement("li");
      li.className = step.ok ? "ok" : "fail";
      const idx = document.createElement("span");
      idx.className = "idx";
      idx.textContent = String(i + 1).padStart(2, "0");
      const code = document.createElement("code");
      code.textContent = PDA.formatDelta(step);
      li.append(idx, code);
      registroEl.appendChild(li);
    }
    // Só rola o próprio log — nunca a página nem o painel lateral.
    registroEl.scrollTop = registroEl.scrollHeight;
  }

  function renderDiagram() {
    nodes.forEach(function (node) {
      node.classList.toggle("is-current", node.getAttribute("data-state") === config.state);
    });
    const hot =
      lastStep && lastStep.ok ? lastStep.from + ">" + lastStep.to : lastStep && !lastStep.ok ? null : null;
    edges.forEach(function (edge) {
      const key = edge.getAttribute("data-edge");
      edge.classList.toggle("is-hot", Boolean(hot && key === hot));
    });
  }

  function renderDelta() {
    if (!lastStep || lastStep.ignored) {
      deltaEl.textContent = "δ(?, ?, ?)";
      deltaEl.className = "delta-line";
      deltaPlainEl.textContent = "Nenhum símbolo processado.";
      return;
    }
    deltaEl.textContent = PDA.formatDelta(lastStep);
    deltaEl.className = "delta-line " + (lastStep.ok ? "ok" : "fail");
    deltaPlainEl.textContent = PDA.describeStep(lastStep);
  }

  function renderTip() {
    const tip = PDA.coachTip(config, lastStep);
    if (dicaTituloEl) dicaTituloEl.textContent = tip.title;
    if (dicaEl) dicaEl.textContent = tip.body;

    if (!gestosEl) return;
    gestosEl.replaceChildren();
    const moves = PDA.legalMoves(config);
    if (config.halted) {
      const chip = document.createElement("span");
      chip.className = "move-chip locked";
      chip.innerHTML =
        '<span class="sym">—</span> ' + (config.accepted ? "aceita" : "rejeitada");
      gestosEl.appendChild(chip);
      return;
    }
    moves.forEach(function (move) {
      const chip = document.createElement("span");
      chip.className = "move-chip";
      chip.title = move.delta;
      chip.innerHTML =
        '<span class="sym">' +
        escapeHtml(move.symbol) +
        "</span> " +
        escapeHtml(move.hint);
      gestosEl.appendChild(chip);
    });
  }

  function render() {
    withScrollLock(function () {
      const info = PDA.STATE_INFO[config.state];
      estadoEl.textContent = config.state;
      estadoNomeEl.textContent = info ? info.name : "";
      simboloEl.textContent = config.symbol || "-";
      simboloDescEl.textContent = config.symbol
        ? PDA.SYMBOL_INFO[config.symbol] || "símbolo"
        : "—";

      const verdict = PDA.verdictText(config);
      vereditoEl.textContent = config.halted
        ? config.accepted
          ? "ACEITA"
          : "REJEITADA"
        : "EM CURSO";
      vereditoEl.className =
        "verdict " + (config.accepted ? "aceita" : config.rejected ? "rejeita" : "curso");
      vereditoEl.title = verdict;
      vereditoDetalheEl.textContent = verdictDetail();

      renderStack();
      renderTape();
      renderLog();
      renderDiagram();
      renderDelta();
      renderTip();

      if (fimEl) fimEl.hidden = !(config.accepted || config.rejected);

      if (srStatusEl) {
        const tip = PDA.coachTip(config, lastStep);
        srStatusEl.textContent =
          config.state +
          ", topo " +
          (PDA.topOf(config) || "-") +
          ", " +
          vereditoEl.textContent +
          ". " +
          tip.body;
      }
    });
  }

  function playString(raw) {
    stopAnim();
    game.reset();
    config = PDA.createConfig();
    lastStep = null;
    log = [];
    mode = "sim";
    render();

    const cleaned = PDA.cleanInput(raw);
    let index = 0;

    function tick() {
      if (mode !== "sim") return;
      if (index >= cleaned.length) {
        config = PDA.finish(config);
        mode = "ended";
        game.focusState(config.state);
        if (config.accepted && SFX) SFX.play("accept");
        render();
        return;
      }
      const symbol = cleaned[index];
      index += 1;
      if (PDA.ALPHABET.indexOf(symbol) === -1) {
        config = PDA.rejectInvalid(config, symbol, index - 1);
        lastStep = null;
        mode = "ended";
        game.focusState("qR");
        render();
        return;
      }
      const step = PDA.applyStep(config, symbol);
      config = step.config;
      lastStep = step;
      log.push(step);
      game.focusState(config.state);
      game.pulse(step);
      if (SFX) SFX.playStep(step);
      if (!config.rejected && index >= cleaned.length) {
        config = PDA.finish(config);
        if (config.accepted && SFX) SFX.play("accept");
      }
      if (config.halted) mode = "ended";
      render();
      if (mode === "sim") anim = window.setTimeout(tick, delayMs());
    }

    anim = window.setTimeout(tick, delayMs());
  }

  PDA.EXAMPLES.forEach(function (example) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    const expectClass = example.expect === "aceita" ? "tag-ok" : "tag-bad";
    button.innerHTML =
      '<span class="chain">' +
      escapeHtml(example.label) +
      '</span><span class="meta">' +
      escapeHtml(example.blurb) +
      ' · <span class="' +
      expectClass +
      '">' +
      example.expect +
      "</span></span>";
    button.addEventListener("click", function () {
      if (SFX) SFX.play("ui");
      input.value = example.label;
      playString(example.input);
    });
    exemplosEl.appendChild(button);
  });

  Object.keys(PDA.SYMBOL_INFO).forEach(function (symbol) {
    const item = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "badge " + symbol;
    badge.textContent = symbol;
    const desc = document.createElement("span");
    desc.className = "desc";
    desc.textContent = PDA.SYMBOL_INFO[symbol];
    item.append(badge, desc);
    legendaEl.appendChild(item);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (SFX) SFX.play("ui");
    playString(input.value);
  });

  reiniciarEl.addEventListener("click", resetAll);

  if (muteEl && SFX) {
    syncMuteButton();
    muteEl.addEventListener("click", function () {
      SFX.toggle();
      syncMuteButton();
      if (!SFX.isMuted()) SFX.play("ui");
    });
  }

  window.addEventListener("keydown", function (event) {
    if (typingTarget(event.target)) return;
    if (event.key.toLowerCase() === "r" && !event.repeat) {
      event.preventDefault();
      resetAll();
      return;
    }
    const key = event.key.toLowerCase();
    const dir = DIRS[key];
    if (!dir) return;
    event.preventDefault();
    if (event.repeat) return;
    if (!held.has(key)) {
      held.add(key);
      lastKey = key;
      game.move(dir[0], dir[1]);
      nextRepeat = performance.now() + 170;
    }
  });

  window.addEventListener("keyup", function (event) {
    const key = event.key.toLowerCase();
    held.delete(key);
    if (lastKey === key) {
      const rest = Array.from(held);
      lastKey = rest.length ? rest[rest.length - 1] : null;
    }
  });

  window.addEventListener("blur", function () {
    held.clear();
    lastKey = null;
  });

  function repeatLoop(now) {
    if (
      lastKey &&
      held.has(lastKey) &&
      now >= nextRepeat &&
      !typingTarget(document.activeElement)
    ) {
      const dir = DIRS[lastKey];
      if (dir) game.move(dir[0], dir[1]);
      nextRepeat = now + 150;
    }
    window.requestAnimationFrame(repeatLoop);
  }

  render();
  window.requestAnimationFrame(repeatLoop);
})();
