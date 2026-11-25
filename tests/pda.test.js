"use strict";
const assert = require("node:assert/strict");
const PDA = require("../js/pda.js");

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log("ok   " + name);
  } catch (error) {
    console.error("FAIL " + name + "\n     " + error.message);
    process.exitCode = 1;
  }
}

function accepts(raw) {
  const { config } = PDA.runString(raw);
  assert.equal(config.accepted, true, raw + " deveria ser aceita: " + PDA.verdictText(config));
  assert.equal(config.state, "q5");
  assert.deepEqual(config.stack, ["Z"]);
}

function rejects(raw, reason, failIndex) {
  const { config } = PDA.runString(raw);
  assert.equal(config.accepted, false, raw + " deveria ser rejeitada");
  assert.equal(config.rejected, true);
  assert.equal(config.reason, reason);
  if (failIndex !== undefined) assert.equal(config.failIndex, failIndex);
}

test("quatro exemplos da interface batem com o esperado", () => {
  for (const example of PDA.EXAMPLES) {
    const { config } = PDA.runString(example.input);
    assert.equal(config.accepted, example.expect === "aceita", example.label);
  }
});

test("cadeias aceitas exigem inspeção (qi) antes de n", () => {
  accepts("abesn");
  accepts("a b e s n");
  accepts("akdbesn");
  accepts("abeekdsabsn");
  accepts("abeeesssn");
  accepts("aaabbbesn");
  rejects("abeeessn", "undefined", 7);
  accepts("a" + "a".repeat(40) + "b".repeat(41) + "esn");
});

test("válvula sem inspeção rejeita (abn)", () => {
  rejects("abn", "undefined", 2);
});

test("LIFO: o tipo do topo importa", () => {
  accepts("akdbesn");
  rejects("akbn", "undefined", 2);
  rejects("akb", "undefined", 2);
});

test("anel só sela com R no topo", () => {
  rejects("abeasn", "undefined", 4);
  rejects("aben", "undefined", 3);
});

test("entrada esgotada fora de q5 rejeita", () => {
  rejects("abes", "not-final");
  rejects("ab", "not-final");
  rejects("", "not-final");
  rejects("abee", "not-final");
});

test("profundidade máxima de três anéis", () => {
  rejects("abeeee", "undefined", 5);
  const { config } = PDA.runString("abeee");
  assert.equal(config.state, "q4");
  assert.deepEqual(config.stack, ["Z", "R", "R", "R"]);
});

test("símbolo fora do alfabeto", () => {
  rejects("abesnX", "invalid-symbol", 5);
  rejects("x", "invalid-symbol", 0);
});

test("estado final q5 não aceita mais símbolos", () => {
  rejects("abesnn", "undefined");
});

test("quem rejeita para no primeiro símbolo inválido", () => {
  const { steps } = PDA.runString("babnabn");
  assert.equal(steps.length, 1);
});

test("determinismo: regras sem chave duplicada", () => {
  const rules = PDA.definedTransitions();
  const keys = new Set(rules.map((r) => r.from + "|" + r.read + "|" + r.pop));
  assert.equal(rules.length, 71);
  assert.equal(keys.size, rules.length);
});

test("o fundo Z nunca é desempilhado sem repor", () => {
  const rules = PDA.definedTransitions();
  for (const rule of rules) {
    if (rule.pop === "Z") assert.ok(rule.push.endsWith("Z"), JSON.stringify(rule));
  }
});

test("trilha do exemplo aninhado chega em qi antes de q5", () => {
  const { steps } = PDA.runString("abeekdsabsn");
  const trail = steps.map((s) => s.to + ":" + s.config.stack.join(""));
  assert.deepEqual(trail, [
    "q1:ZA",
    "q1:Z",
    "q2:ZR",
    "q3:ZRR",
    "q3:ZRRK",
    "q3:ZRR",
    "q2:ZR",
    "q2:ZRA",
    "q2:ZR",
    "qi:Z",
    "q5:Z",
  ]);
});

test("selar o anel 1 leva a qi, não a q1", () => {
  const { config } = PDA.runString("abes");
  assert.equal(config.state, "qi");
  assert.deepEqual(config.stack, ["Z"]);
});

test("formatDelta usa a notação formal", () => {
  const { steps } = PDA.runString("abe");
  assert.equal(PDA.formatDelta(steps[0]), "δ(q0, a, Z) = (q1, AZ)");
  assert.equal(PDA.formatDelta(steps[1]), "δ(q1, b, A) = (q1, ε)");
  const bad = PDA.runString("ak" + "b").steps[2];
  assert.equal(PDA.formatDelta(bad), "δ(q1, b, K) = ∅  · erro (sem transição)");
});

test("legalMoves na doca só permite a", () => {
  const moves = PDA.legalMoves(PDA.createConfig());
  assert.deepEqual(
    moves.map((m) => m.symbol),
    ["a"],
  );
});

test("legalMoves com topo K oferece d e não b como único desempilha", () => {
  let cfg = PDA.createConfig();
  cfg = PDA.applyStep(cfg, "a").config;
  cfg = PDA.applyStep(cfg, "k").config;
  const symbols = PDA.legalMoves(cfg).map((m) => m.symbol);
  assert.ok(symbols.includes("d"));
  assert.equal(symbols.includes("b"), false);
});

test("em q1 com topo Z a válvula n não é legal", () => {
  let cfg = PDA.createConfig();
  cfg = PDA.applyStep(cfg, "a").config;
  cfg = PDA.applyStep(cfg, "b").config;
  assert.equal(cfg.state, "q1");
  assert.deepEqual(cfg.stack, ["Z"]);
  const symbols = PDA.legalMoves(cfg).map((m) => m.symbol);
  assert.equal(symbols.includes("n"), false);
  assert.ok(symbols.includes("e"));
});

test("em qi com topo Z a válvula n é legal", () => {
  let cfg = PDA.runString("abes").config;
  // not-final ainda, mas estado qi
  cfg = Object.assign({}, cfg, { halted: false, rejected: false, accepted: false, reason: null });
  // runString already finished — rebuild:
  cfg = PDA.createConfig();
  for (const ch of "abes") cfg = PDA.applyStep(cfg, ch).config;
  assert.equal(cfg.state, "qi");
  const symbols = PDA.legalMoves(cfg).map((m) => m.symbol);
  assert.ok(symbols.includes("n"));
});

test("coachTip aponta d antes de b com topo K", () => {
  let cfg = PDA.createConfig();
  cfg = PDA.applyStep(cfg, "a").config;
  cfg = PDA.applyStep(cfg, "k").config;
  const tip = PDA.coachTip(cfg, null);
  assert.match(tip.body, /d antes de b|comporta fria/i);
  assert.match(tip.title, /TOPO K|GALERIA/i);
});

test("endingInfo distingue válvula travada de comporta errada", () => {
  const locked = PDA.runString("abn");
  const end = PDA.endingInfo(locked.config, locked.steps[locked.steps.length - 1]);
  assert.equal(end.kind, "reject");
  assert.match(end.title, /VÁLVULA TRAVADA/i);

  const wrong = PDA.runString("akb");
  const end2 = PDA.endingInfo(wrong.config, wrong.steps[wrong.steps.length - 1]);
  assert.match(end2.title, /COMPORTA ERRADA/i);

  const ok = PDA.runString("abesn");
  const end3 = PDA.endingInfo(ok.config, ok.steps[ok.steps.length - 1]);
  assert.equal(end3.kind, "accept");
  assert.match(end3.title, /CALDEIRA ALIVIADA/i);
});

console.log("\n" + passed + " testes passaram");
