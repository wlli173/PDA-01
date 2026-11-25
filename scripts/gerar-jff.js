"use strict";
// Gera os arquivos JFLAP a partir de js/pda.js.
// Uso: npm run jff
//
//  automato.jff          — δ expandida (todas as combinações de topo); simulação no JFLAP
//  automato-parcial.jff  — esquema do diagrama (X ∈ Γ como um único símbolo); parcial/pedagógico
const fs = require("node:fs");
const path = require("node:path");
const PDA = require("../js/pda.js");

const STATES = [
  ["q0", 70, 100, true, false],
  ["q1", 210, 100, false, false],
  ["q2", 370, 100, false, false],
  ["q3", 530, 100, false, false],
  ["q4", 690, 100, false, false],
  ["qi", 210, 250, false, false],
  ["q5", 420, 250, false, true],
];

/** Mesmas arestas do diagrama SVG: X representa qualquer topo ∈ Γ (não expandido). */
function schematicTransitions() {
  const list = [];
  list.push({ from: "q0", to: "q1", read: "a", pop: "Z", push: "AZ" });

  for (const q of PDA.LOOP_STATES) {
    list.push({ from: q, to: q, read: "a", pop: "X", push: "AX" });
    list.push({ from: q, to: q, read: "k", pop: "X", push: "KX" });
    list.push({ from: q, to: q, read: "b", pop: "A", push: "" });
    list.push({ from: q, to: q, read: "d", pop: "K", push: "" });
  }

  list.push({ from: "q1", to: "q2", read: "e", pop: "X", push: "RX" });
  list.push({ from: "qi", to: "q2", read: "e", pop: "X", push: "RX" });
  list.push({ from: "q2", to: "q3", read: "e", pop: "X", push: "RX" });
  list.push({ from: "q3", to: "q4", read: "e", pop: "X", push: "RX" });

  list.push({ from: "q4", to: "q3", read: "s", pop: "R", push: "" });
  list.push({ from: "q3", to: "q2", read: "s", pop: "R", push: "" });
  list.push({ from: "q2", to: "qi", read: "s", pop: "R", push: "" });
  list.push({ from: "qi", to: "q5", read: "n", pop: "Z", push: "Z" });
  return list;
}

function writeJff(filename, rules, comment) {
  const id = Object.fromEntries(STATES.map((state, index) => [state[0], index]));
  const lines = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    "<!--Created with JFLAP 7.1.-->",
    comment ? "<!-- " + comment + " -->" : null,
    "<structure>",
    "\t<type>pda</type>",
    "\t<automaton>",
  ].filter(Boolean);

  for (const [name, x, y, initial, final] of STATES) {
    lines.push(`\t\t<state id="${id[name]}" name="${name}">`);
    lines.push(`\t\t\t<x>${x}.0</x>`);
    lines.push(`\t\t\t<y>${y}.0</y>`);
    if (initial) lines.push("\t\t\t<initial/>");
    if (final) lines.push("\t\t\t<final/>");
    lines.push("\t\t</state>");
  }

  for (const rule of rules) {
    lines.push("\t\t<transition>");
    lines.push(`\t\t\t<from>${id[rule.from]}</from>`);
    lines.push(`\t\t\t<to>${id[rule.to]}</to>`);
    lines.push(`\t\t\t<read>${rule.read}</read>`);
    lines.push(`\t\t\t<pop>${rule.pop}</pop>`);
    lines.push(rule.push ? `\t\t\t<push>${rule.push}</push>` : "\t\t\t<push/>");
    lines.push("\t\t</transition>");
  }

  lines.push("\t</automaton>", "</structure>", "");
  const out = path.join(__dirname, "..", filename);
  fs.writeFileSync(out, lines.join("\n"), "utf8");
  console.log(filename + " gerado com " + rules.length + " transições");
}

const expanded = PDA.definedTransitions();
writeJff(
  "automato.jff",
  expanded,
  "δ expandida (todas as combinações de topo ∈ Γ). Determinística, pronta para simular no JFLAP.",
);

const partial = schematicTransitions();
writeJff(
  "automato-parcial.jff",
  partial,
  "Esquema parcial do diagrama: X ∈ Γ não expandido. Pedagógico — use automato.jff para simulação completa.",
);
