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
 *
 * Fluxo de missão: doca (q0) → galeria (q1) → pelo menos um anel → retorno
 * inspecionado (qi) → válvula n com topo Z → q5. Sem inspeção, n é indefinido.
 */
(function (root) {
  "use strict";

  const ALPHABET = ["a", "k", "b", "d", "e", "s", "n"];
  const STACK_ALPHA = ["Z", "A", "K", "R"];
  /** Estados com laços de lacres/comportas (a/k/b/d). */
  const LOOP_STATES = ["q1", "qi", "q2", "q3", "q4"];
  /** Estados a partir dos quais se pode descer um anel (e). */
  const ENTER_STATES = ["q1", "qi", "q2", "q3"];

  const STATE_INFO = {
    q0: { name: "Doca", place: "Doca de carga" },
    q1: { name: "Galeria", place: "Galeria — inspeção pendente" },
    qi: { name: "Pronta", place: "Galeria — anel selado, válvula liberada" },
    q2: { name: "Casa de máquinas", place: "Anel 1" },
    q3: { name: "Passadiço", place: "Anel 2" },
    q4: { name: "Caldeira", place: "Anel 3 — fundo" },
    q5: { name: "Núcleo", place: "Válvula aliviada" },
  };

  /** Descrição voltada à ação no mapa (não só o símbolo formal). */
  const SYMBOL_INFO = {
    a: "pegar cartucho quente — empilha A (abre a porta da doca; alimenta b)",
    k: "pegar cartucho frio — empilha K (alimenta d)",
    b: "abrir comporta quente — gasta A do topo (só se topo for A)",
    d: "abrir comporta fria — gasta K do topo (só se topo for K)",
    e: "descer ao anel — empilha R (marca o nível)",
    s: "selar o anel e subir — exige R no topo (limpe lacres acima)",
    n: "girar a válvula — só em qi com topo Z → q5",
  };

  /** Rótulo curto no mapa: a ação, não só a letra. */
  const SYMBOL_ACTION = {
    a: "PEGAR",
    k: "PEGAR",
    b: "ABRIR",
    d: "ABRIR",
    e: "DESCER",
    s: "SELAR",
    n: "GIRAR",
  };

  const EXAMPLES = [
    {
      input: "abesn",
      label: "a b e s n",
      expect: "aceita",
      blurb: "Inspeciona 1 anel e gira a válvula",
    },
    {
      input: "akdbesn",
      label: "a k d b e s n",
      expect: "aceita",
      blurb: "LIFO de lacres + inspeção",
    },
    {
      input: "abeekdsabsn",
      label: "a b e e k d s a b s n",
      expect: "aceita",
      blurb: "Dois anéis, LIFO e retorno",
    },
    {
      input: "abn",
      label: "a b n",
      expect: "rejeita",
      blurb: "Válvula sem inspeção (falta e/s)",
    },
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

    for (const from of ENTER_STATES) {
      const to = from === "q1" || from === "qi" ? "q2" : from === "q2" ? "q3" : "q4";
      for (const top of STACK_ALPHA) {
        list.push({ from: from, to: to, read: "e", pop: top, push: "R" + top });
      }
    }

    list.push({ from: "q4", to: "q3", read: "s", pop: "R", push: "" });
    list.push({ from: "q3", to: "q2", read: "s", pop: "R", push: "" });
    // Selar o anel 1 libera a válvula: chega em qi (não em q1).
    list.push({ from: "q2", to: "qi", read: "s", pop: "R", push: "" });
    list.push({ from: "qi", to: "q5", read: "n", pop: "Z", push: "Z" });
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
      // δ indefinida: não há transição — permanece no estado atual e marca erro.
      const next = Object.assign({}, config, {
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
        to: null,
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
    if (!step.ok) {
      return "δ(" + step.from + ", " + step.symbol + ", " + top + ") = ∅  · erro (sem transição)";
    }
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

  /**
   * Texto de fim de missão para o banner do canvas (aceita / rejeita).
   * Foca na ação narrativa, não só no veredito formal.
   */
  function endingInfo(config, lastStep) {
    if (!config || !config.halted) return null;

    if (config.accepted) {
      return {
        kind: "accept",
        title: "CALDEIRA ALIVIADA",
        subtitle: "Inspeção ok · válvula liberada · q5",
      };
    }

    if (config.reason === "not-final") {
      return {
        kind: "reject",
        title: "MISSÃO INCOMPLETA",
        subtitle: "Entrada acabou em " + config.state + " — falta girar n em qi",
      };
    }

    if (config.reason === "invalid-symbol") {
      return {
        kind: "reject",
        title: "SÍMBOLO INVÁLIDO",
        subtitle: "'" + config.symbol + "' fora de Σ",
      };
    }

    if (lastStep && !lastStep.ok) {
      const top = lastStep.top == null ? "∅" : lastStep.top;
      const sym = lastStep.symbol;
      if (sym === "b" && top === "K") {
        return {
          kind: "reject",
          title: "COMPORTA ERRADA",
          subtitle: "Topo K — use a comporta fria (d)",
        };
      }
      if (sym === "d" && top === "A") {
        return {
          kind: "reject",
          title: "COMPORTA ERRADA",
          subtitle: "Topo A — use a comporta quente (b)",
        };
      }
      if (sym === "b" || sym === "d") {
        return {
          kind: "reject",
          title: "SEM LACRE NO TOPO",
          subtitle: "Abertura exige " + (sym === "b" ? "A" : "K") + " no topo (agora " + top + ")",
        };
      }
      if (sym === "s" && top !== "R") {
        return {
          kind: "reject",
          title: "ANEL BLOQUEADO",
          subtitle: "Há " + top + " acima de R — gaste o lacre antes de selar",
        };
      }
      if (sym === "n") {
        if (lastStep.from === "q1") {
          return {
            kind: "reject",
            title: "VÁLVULA TRAVADA",
            subtitle: "Desça (e), sele o anel (s) e volte — só então gire n",
          };
        }
        if (top !== "Z") {
          return {
            kind: "reject",
            title: "PILHA NÃO ZERADA",
            subtitle: "Topo " + top + " — feche anéis e gaste lacres antes de n",
          };
        }
        return {
          kind: "reject",
          title: "VÁLVULA FORA DE LUGAR",
          subtitle: "n só em qi (galeria inspecionada) com topo Z",
        };
      }
      if (sym === "e" && lastStep.from === "q4") {
        return {
          kind: "reject",
          title: "FUNDO DA CALDEIRA",
          subtitle: "Não há anel abaixo — sele (s) para subir",
        };
      }
      if (sym === "a" && lastStep.from === "q0" && top !== "Z") {
        return {
          kind: "reject",
          title: "DOCA TRAVADA",
          subtitle: "Na doca só o primeiro cartucho quente abre a porta",
        };
      }
      return {
        kind: "reject",
        title: "ERRO DE TRANSIÇÃO",
        subtitle: "δ(" + lastStep.from + ", " + sym + ", " + top + ") indefinida",
      };
    }

    return {
      kind: "reject",
      title: "ERRO DE TRANSIÇÃO",
      subtitle: "Nenhuma transição prevista para essa entrada",
    };
  }

  const MOVE_HINT = {
    a: "pegar cartucho quente",
    k: "pegar cartucho frio",
    b: "abrir comporta quente",
    d: "abrir comporta fria",
    e: "descer ao anel",
    s: "selar e subir",
    n: "girar válvula → q5",
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

  /** Dica objetiva: o que fazer agora em relação à meta (válvula após inspeção). */
  function coachTip(config, lastStep) {
    if (!config) return { title: "—", body: "Aguardando entrada." };

    if (config.accepted) {
      return {
        title: "MISSÃO CUMPRIDA",
        body: "Caldeira aliviada. Cadeia aceita em q5; pilha em Z.",
      };
    }

    if (config.rejected) {
      const end = endingInfo(config, lastStep);
      return {
        title: end ? end.title : "REJEITADA",
        body: (end ? end.subtitle + ". " : "") + "Reinicie (R).",
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
        body: "Pegue o cartucho quente (a). Ele abre a porta e leva à galeria.",
      };
    }

    if (config.state === "q5") {
      return {
        title: "NÚCLEO",
        body: "Estado final. Com a fita esgotada, a cadeia é aceita.",
      };
    }

    if (config.state === "q1") {
      if (top === "Z") {
        return {
          title: "INSPEÇÃO PENDENTE",
          body:
            "A válvula ainda está travada. Desça (e), sele o anel (s) e volte — aí gire n. Ações: " +
            lista +
            ".",
        };
      }
      if (top === "K") {
        return {
          title: "GALERIA · TOPO K",
          body: "Abra a comporta fria (d) antes de descer, ou empilhe outro lacre. Ações: " + lista + ".",
        };
      }
      if (top === "A") {
        return {
          title: "GALERIA · TOPO A",
          body:
            "Abra a comporta quente (b) ou desça (e) com o lacre. Meta: inspecionar um anel. Ações: " +
            lista +
            ".",
        };
      }
      return {
        title: "GALERIA",
        body: "Desça ao anel (e) para inspecionar. Ações: " + lista + ".",
      };
    }

    if (config.state === "qi") {
      if (top === "Z" && symbols.indexOf("n") !== -1) {
        return {
          title: "VÁLVULA LIBERADA",
          body: "Inspeção ok e pilha em Z. Gire n para aliviar a caldeira.",
        };
      }
      if (top === "K") {
        return {
          title: "PRONTA · TOPO K",
          body: "Gaste K com d antes de girar n. Ações: " + lista + ".",
        };
      }
      if (top === "A") {
        return {
          title: "PRONTA · TOPO A",
          body: "Gaste A com b (ou desça de novo) antes de n. Ações: " + lista + ".",
        };
      }
      if (top === "R") {
        return {
          title: "PRONTA · TOPO R",
          body: "Ainda há anel aberto? Selar só funciona nos anéis. Limpe a pilha até Z.",
        };
      }
      return {
        title: "PRONTA",
        body: "Meta: topo Z e girar n. Ações: " + lista + ".",
      };
    }

    if (top === "K" && symbols.indexOf("d") !== -1) {
      return {
        title: "TOPO K",
        body: "Cartucho frio no topo. Abra a comporta fria (d) antes de b. Ações: " + lista + ".",
      };
    }

    if (top === "A" && symbols.indexOf("s") === -1 && config.state !== "qi") {
      return {
        title: "ANEL · TOPO A",
        body: "Lacre acima do retorno. Use b antes de selar (s). Ações: " + lista + ".",
      };
    }

    if (top === "A") {
      return {
        title: "TOPO A",
        body: "Abra a comporta quente (b), ou empilhe outro lacre/anel. Ações: " + lista + ".",
      };
    }

    if (top === "R") {
      return {
        title: "TOPO R",
        body: "Selar (s) sobe um nível. Só depois de todos os R saírem a válvula libera.",
      };
    }

    if (config.state === "q4") {
      return {
        title: "CALDEIRA",
        body: "Fundo. Gaste lacres do topo e sele (s) para subir. Ações: " + lista + ".",
      };
    }

    if (config.state === "q2" || config.state === "q3") {
      return {
        title: (config.state === "q2" ? "CASA DE MÁQUINAS" : "PASSADIÇO") + " · TOPO " + top,
        body:
          "Desça (e), use lacres nas comportas ou sele (s) para voltar. Ações: " + lista + ".",
      };
    }

    return {
      title: config.state + " · TOPO " + top,
      body: "Meta: inspecionar anel, voltar a qi com topo Z e girar n. Ações: " + lista + ".",
    };
  }

  const api = {
    ALPHABET,
    STACK_ALPHA,
    LOOP_STATES,
    ENTER_STATES,
    STATE_INFO,
    SYMBOL_INFO,
    SYMBOL_ACTION,
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
    endingInfo,
    legalMoves,
    coachTip,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.VigiaPDA = api;
})(typeof window !== "undefined" ? window : globalThis);
