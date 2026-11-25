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

test("cadeias aceitas", () => {
  accepts("abn");
  accepts("a b n");
  accepts("akdbn");
  accepts("abeekdsabsn");
  accepts("abeeesssn");
  accepts("aaabbbn");
  rejects("abeeessn", "undefined", 7);
  accepts("a" + "a".repeat(40) + "b".repeat(41) + "n");
});

test("LIFO: o tipo do topo importa", () => {
  accepts("akdbn");
  rejects("akbn", "undefined", 2);
  rejects("akb", "undefined", 2);
});

test("anel só sela com R no topo", () => {
  rejects("abeasn", "undefined", 4);
  rejects("aben", "undefined", 3);
});

test("entrada esgotada fora de q5 rejeita", () => {
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
  rejects("abnX", "invalid-symbol", 3);
  rejects("x", "invalid-symbol", 0);
});

test("estado final q5 não aceita mais símbolos", () => {
  rejects("abnn", "undefined");
});

test("quem rejeita para no primeiro símbolo inválido", () => {
  const { steps } = PDA.runString("babnabn");
  assert.equal(steps.length, 1);
});

test("determinismo: 57 regras sem chave duplicada", () => {
  const rules = PDA.definedTransitions();
  const keys = new Set(rules.map((r) => r.from + "|" + r.read + "|" + r.pop));
  assert.equal(rules.length, 57);
  assert.equal(keys.size, rules.length);
});

test("o fundo Z nunca é desempilhado sem repor", () => {
  const rules = PDA.definedTransitions();
  for (const rule of rules) {
    if (rule.pop === "Z") assert.ok(rule.push.endsWith("Z"), JSON.stringify(rule));
  }
});

test("trilha do exemplo aninhado", () => {
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
    "q1:Z",
    "q5:Z",
  ]);
});

test("formatDelta usa a notação formal", () => {
  const { steps } = PDA.runString("abe");
  assert.equal(PDA.formatDelta(steps[0]), "δ(q0, a, Z) = (q1, AZ)");
  assert.equal(PDA.formatDelta(steps[1]), "δ(q1, b, A) = (q1, ε)");
  const bad = PDA.runString("ak" + "b").steps[2];
  assert.equal(PDA.formatDelta(bad), "δ(q1, b, K) = ∅  →  qR");
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

test("coachTip aponta d antes de b com topo K", () => {
  let cfg = PDA.createConfig();
  cfg = PDA.applyStep(cfg, "a").config;
  cfg = PDA.applyStep(cfg, "k").config;
  const tip = PDA.coachTip(cfg, null);
  assert.match(tip.body, /d antes de b|comporta fria/i);
  assert.match(tip.title, /TOPO K/i);
});

console.log("\n" + passed + " testes passaram");
