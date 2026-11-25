"use strict";
// Gera automato.jff a partir do mesmo δ usado pelo jogo (js/pda.js).
// Uso: npm run jff   (ou: node scripts/gerar-jff.js)
const fs = require("node:fs");
const path = require("node:path");
const PDA = require("../js/pda.js");

const states = [
  ["q0", 90, 140, true, false],
  ["q1", 240, 140, false, false],
  ["q2", 390, 140, false, false],
  ["q3", 540, 140, false, false],
  ["q4", 690, 140, false, false],
  ["q5", 240, 280, false, true],
  ["qR", 90, 280, false, false],
];
const id = Object.fromEntries(states.map((state, index) => [state[0], index]));
const rules = PDA.definedTransitions();

const lines = [
  '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
  "<!--Created with JFLAP 7.1.-->",
  "<structure>",
  "\t<type>pda</type>",
  "\t<automaton>",
];
for (const [name, x, y, initial, final] of states) {
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

const out = path.join(__dirname, "..", "automato.jff");
fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log("automato.jff gerado com " + rules.length + " transições");
