/**
 * Vigia-7 — autômato de pilha determinístico.
 *
 * Script clássico (sem import/export): funciona com duplo clique em index.html
 * (file://), em servidor local e no GitHub Pages. No navegador expõe
 * window.VigiaPDA; no Node, module.exports (usado em tests/ e scripts/).
 *
 * Topo da pilha: último elemento do array `stack`.
 * Cadeia escrita em δ (ex.: "AZ"): caractere à esquerda = topo.
 * Aceita por estado final q5 com a entrada esgotada. Z permanece no fundo.
 */
(function (root) {
  "use strict";

  const ALPHABET = ["a", "k", "b", "d", "e", "s", "n"];
  const STACK_ALPHA = ["Z", "A", "K", "R"];
  const LOOP_STATES = ["q1", "q2", "q3", "q4"];

  const STATE_INFO = {
    q0: { name: "Doca", place: "Doca de carga" },
    q1: { name: "Galeria", place: "Galeria de contenção" },
    q2: { name: "Casa de máquinas", place: "Anel 1" },
    q3: { name: "Passadiço", place: "Anel 2" },
    q4: { name: "Caldeira", place: "Anel 3 — fundo" },
    q5: { name: "Núcleo", place: "Válvula aliviada" },
    qR: { name: "Pane", place: "Servos travados" },
  };

  const SYMBOL_INFO = {
    a: "lacre quente — empilha A (abre a porta da doca e alimenta b)",
    k: "lacre frio — empilha K (alimenta d)",
    b: "comporta quente — exige A no topo",
    d: "comporta fria — exige K no topo",
    e: "entrar no anel — empilha R",
    s: "selar o anel — exige R no topo",
    n: "válvula na galeria — exige q1 e topo Z → q5",
  };

  const EXAMPLES = [
    { input: "abn", label: "a b n", expect: "aceita", blurb: "Doca → comporta → válvula" },
    { input: "akdbn", label: "a k d b n", expect: "aceita", blurb: "Dois lacres, ordem LIFO" },
    {
      input: "abeekdsabsn",
      label: "a b e e k d s a b s n",
      expect: "aceita",
      blurb: "Dois anéis e retorno à válvula",
    },
    { input: "abeasn", label: "a b e a s n", expect: "rejeita", blurb: "Lacre acima de R ao selar" },
  ];

  let transitionTable = null;

  function definedTransitions() {
    const list = [];
    list.push({ from: "q0", to: "q1", read: "a", pop: "Z", push: "AZ" });

    for (const q of LOOP_STATES) {
      for (const top of STACK_ALPHA) {
        list.push({ from: q, to: q, read: "a", pop: top, push: "A" + top });
        list.push({ from: q, to: q, read: "k", pop: top, push: "K" + top });
      }
      list.push({ from: q, to: q, read: "b", pop: "A", push: "" });
      list.push({ from: q, to: q, read: "d", pop: "K", push: "" });
    }

    for (const top of STACK_ALPHA) {
      list.push({ from: "q1", to: "q2", read: "e", pop: top, push: "R" + top });
      list.push({ from: "q2", to: "q3", read: "e", pop: top, push: "R" + top });
      list.push({ from: "q3", to: "q4", read: "e", pop: top, push: "R" + top });
    }

    list.push({ from: "q4", to: "q3", read: "s", pop: "R", push: "" });
    list.push({ from: "q3", to: "q2", read: "s", pop: "R", push: "" });
    list.push({ from: "q2", to: "q1", read: "s", pop: "R", push: "" });
    list.push({ from: "q1", to: "q5", read: "n", pop: "Z", push: "Z" });
    return list;
  }

  function table() {
    if (transitionTable) return transitionTable;
    transitionTable = new Map();
    for (const rule of definedTransitions()) {
      transitionTable.set(rule.from + "|" + rule.read + "|" + rule.pop, rule);
    }
    return transitionTable;
  }

  function createConfig() {
    return {
      state: "q0",
      stack: ["Z"],
      roteiro: "",
      symbol: null,
      halted: false,
      accepted: false,
      rejected: false,
      reason: null,
      failIndex: null,
    };
  }

  function topOf(config) {
    return config.stack.length ? config.stack[config.stack.length - 1] : null;
  }

  function applyStep(config, symbol) {
    const top = topOf(config);
    if (config.halted) {
      return {
        config,
        ok: false,
        ignored: true,
        from: config.state,
        to: config.state,
        symbol,
        top,
        pop: null,
        push: null,
      };
    }

    const rule = table().get(config.state + "|" + symbol + "|" + top);
    const roteiro = config.roteiro + symbol;

    if (!rule) {
      const next = Object.assign({}, config, {
        state: "qR",
        stack: config.stack.slice(),
        roteiro,
        symbol,
        rejected: true,
        accepted: false,
        halted: true,
        reason: "undefined",
        failIndex: config.roteiro.length,
      });
      return {
        config: next,
        ok: false,
        ignored: false,
        from: config.state,
        to: "qR",
        symbol,
        top,
        pop: top,
        push: null,
      };
    }

    const stack = config.stack.slice(0, -1);
    for (let i = rule.push.length - 1; i >= 0; i -= 1) stack.push(rule.push[i]);

    const next = Object.assign({}, config, {
      state: rule.to,
      stack,
      roteiro,
      symbol,
      rejected: false,
      accepted: false,
      halted: false,
      reason: null,
      failIndex: null,
    });

    return {
      config: next,
      ok: true,
      ignored: false,
      from: config.state,
      to: rule.to,
      symbol,
      top,
      pop: rule.pop,
      push: rule.push,
    };
  }

  /** Encerra a entrada: aceita só em q5; qualquer outro estado rejeita. */
  function finish(config) {
    if (config.rejected) return config;
    if (config.state === "q5") {
      return Object.assign({}, config, {
        accepted: true,
        halted: true,
        rejected: false,
        reason: "accepted",
      });
    }
    return Object.assign({}, config, {
      accepted: false,
      halted: true,
      rejected: true,
      reason: "not-final",
    });
  }

  /** Marca símbolo fora do alfabeto como rejeição imediata (posição `index`). */
  function rejectInvalid(config, symbol, index) {
    return Object.assign({}, config, {
      stack: config.stack.slice(),
      roteiro: config.roteiro + symbol,
      symbol,
      state: "qR",
      rejected: true,
      accepted: false,
      halted: true,
      reason: "invalid-symbol",
      failIndex: index,
    });
  }

  function cleanInput(raw) {
    return String(raw == null ? "" : raw)
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function runString(raw) {
    const cleaned = cleanInput(raw);
    let config = createConfig();
    const steps = [];

    for (let i = 0; i < cleaned.length; i += 1) {
      const symbol = cleaned[i];
      if (!ALPHABET.includes(symbol)) {
        config = rejectInvalid(config, symbol, i);
        break;
      }
      const step = applyStep(config, symbol);
      steps.push(step);
      config = step.config;
      if (config.rejected) break;
    }

    if (!config.rejected) config = finish(config);
    return { config, steps };
  }

  /** Notação formal da transição aplicada: δ(q1, e, A) = (q2, RA). */
  function formatDelta(step) {
    if (!step || step.ignored) return "";
    const top = step.top == null ? "∅" : step.top;
    if (!step.ok) return "δ(" + step.from + ", " + step.symbol + ", " + top + ") = ∅  →  qR";
    const push = step.push === "" ? "ε" : step.push;
    return "δ(" + step.from + ", " + step.symbol + ", " + step.pop + ") = (" + step.to + ", " + push + ")";
  }

  function describeStep(step) {
    if (!step || step.ignored) return "Sem transição.";
    if (!step.ok) {
      const top = step.top == null ? "∅" : step.top;
      return "Indefinida: " + step.symbol + " em " + step.from + " com topo " + top + ".";
    }
    const wrote = step.push === "" ? "ε" : step.push;
    return step.from + " → " + step.to + " · pop " + step.pop + " · push " + wrote + ".";
  }

  function verdictText(config) {
    if (!config.halted) return "Em curso";
    if (config.accepted) return "ACEITA";
    if (config.reason === "not-final") {
      return "REJEITADA — entrada esgotada em " + config.state;
    }
    if (config.reason === "invalid-symbol") {
      return "REJEITADA — símbolo inválido na posição " + (config.failIndex + 1) + " (" + config.symbol + ")";
    }
    return "REJEITADA — falhou na posição " + ((config.failIndex || 0) + 1) + " (" + config.symbol + ")";
  }

  const MOVE_HINT = {
    a: "lacre quente",
    k: "lacre frio",
    b: "comporta quente",
    d: "comporta fria",
    e: "entrar no anel",
    s: "selar o anel",
    n: "válvula → q5",
  };

  /** Símbolos com transição definida no estado/topo atuais (ordem do alfabeto). */
  function legalMoves(config) {
    if (!config || config.halted) return [];
    const top = topOf(config);
    const out = [];
    const seen = {};
    for (let i = 0; i < ALPHABET.length; i += 1) {
      const symbol = ALPHABET[i];
      const rule = table().get(config.state + "|" + symbol + "|" + top);
      if (!rule || seen[symbol]) continue;
      seen[symbol] = true;
      out.push({
        symbol: symbol,
        to: rule.to,
        push: rule.push,
        pop: rule.pop,
        hint: MOVE_HINT[symbol] || "",
        delta:
          "δ(" +
          config.state +
          ", " +
          symbol +
          ", " +
          rule.pop +
          ") = (" +
          rule.to +
          ", " +
          (rule.push === "" ? "ε" : rule.push) +
          ")",
      });
    }
    return out;
  }

  /** Dica objetiva: o que fazer agora em relação à meta (válvula na galeria). */
  function coachTip(config, lastStep) {
    if (!config) return { title: "—", body: "Aguardando entrada." };

    if (config.accepted) {
      return {
        title: "MISSÃO CUMPRIDA",
        body: "Válvula acionada. Cadeia aceita em q5; pilha em Z.",
      };
    }

    if (config.rejected) {
      if (config.reason === "not-final") {
        return {
          title: "REJEITADA",
          body:
            "Entrada esgotada em " +
            config.state +
            ". A meta exige n na galeria (q1) com topo Z.",
        };
      }
      if (lastStep && !lastStep.ok) {
        const top = lastStep.top == null ? "∅" : lastStep.top;
        let why =
          "δ(" + lastStep.from + ", " + lastStep.symbol + ", " + top + ") indefinida.";
        if (lastStep.symbol === "b" && top === "K") {
          why += " Topo é K: use d antes de b.";
        } else if (lastStep.symbol === "d" && top === "A") {
          why += " Topo é A: use b antes de d.";
        } else if (lastStep.symbol === "s" && top !== "R") {
          why += " Selar exige R no topo; use o lacre que está acima.";
        } else if (lastStep.symbol === "n" && (lastStep.from !== "q1" || top !== "Z")) {
          why += " Válvula só na galeria com topo Z (feche anéis e gaste lacres).";
        } else if (lastStep.symbol === "e" && lastStep.from === "q4") {
          why += " Caldeira é o anel mais fundo; não há e. Selecione s para subir.";
        }
        return { title: "REJEITADA", body: why + " Reinicie (R)." };
      }
      return {
        title: "REJEITADA",
        body: "Transição inválida. Reinicie (R) e confira o topo da pilha.",
      };
    }

    const top = topOf(config);
    const moves = legalMoves(config);
    const symbols = moves.map(function (m) {
      return m.symbol;
    });
    const lista = symbols.length ? symbols.join(", ") : "nenhuma";

    if (config.state === "q0") {
      return {
        title: "DOCA",
        body: "Colete o lacre quente (a). Ele abre a porta e leva à galeria — caminho da válvula.",
      };
    }

    if (config.state === "q5") {
      return {
        title: "NÚCLEO",
        body: "Estado final. Com a fita esgotada, a cadeia é aceita.",
      };
    }

    if (top === "K" && symbols.indexOf("d") !== -1) {
      return {
        title: "TOPO K",
        body: "Lacre frio no topo. Abra a comporta fria (d) antes de usar b. Ações: " + lista + ".",
      };
    }

    if (top === "A" && symbols.indexOf("b") !== -1 && config.state === "q1") {
      return {
        title: "GALERIA · TOPO A",
        body:
          "Abra a comporta quente (b), explore um anel (e) ou prepare a válvula. Meta: topo Z e n.",
      };
    }

    if (top === "A" && symbols.indexOf("s") === -1 && config.state !== "q1") {
      return {
        title: "ANEL · TOPO A",
        body:
          "Lacre acima do retorno. Use b (ou o lacre do topo) antes de s. Ações: " + lista + ".",
      };
    }

    if (top === "A") {
      return {
        title: "TOPO A",
        body: "Use b na comporta quente, ou empilhe outro lacre/anel. Ações: " + lista + ".",
      };
    }

    if (top === "R") {
      return {
        title: "TOPO R",
        body:
          "Selar (s) sobe um anel. A válvula (n) só funciona depois de todos os R saírem e você voltar à galeria.",
      };
    }

    if (top === "Z" && config.state === "q1") {
      return {
        title: "VÁLVULA PRONTA",
        body: "Galeria com pilha em Z. Acione n para concluir, ou continue com a/k/e.",
      };
    }

    if (config.state === "q4") {
      return {
        title: "CALDEIRA",
        body: "Anel mais fundo. Gaste lacres do topo e sele (s) para subir. Ações: " + lista + ".",
      };
    }

    if (config.state === "q2" || config.state === "q3") {
      return {
        title: (config.state === "q2" ? "CASA DE MÁQUINAS" : "PASSADIÇO") + " · TOPO " + top,
        body:
          "Desça (e), colete/use lacres ou sele (s) para voltar à galeria e à válvula. Ações: " +
          lista +
          ".",
      };
    }

    return {
      title: config.state + " · TOPO " + top,
      body: "Meta: válvula na galeria com topo Z (n). Ações: " + lista + ".",
    };
  }

  const api = {
    ALPHABET,
    STACK_ALPHA,
    LOOP_STATES,
    STATE_INFO,
    SYMBOL_INFO,
    EXAMPLES,
    MOVE_HINT,
    definedTransitions,
    createConfig,
    topOf,
    applyStep,
    finish,
    rejectInvalid,
    cleanInput,
    runString,
    formatDelta,
    describeStep,
    verdictText,
    legalMoves,
    coachTip,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.VigiaPDA = api;
})(typeof window !== "undefined" ? window : globalThis);
