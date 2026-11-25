"use strict";
const assert = require("node:assert/strict");
const W = require("../js/world.js");
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

const world = W.createWorld();
const solid = new Set(world.decor.map((d) => d.x + "," + d.y));

function walkable(x, y, doorOpen) {
  if (x < 0 || y < 0 || x >= W.COLS || y >= W.ROWS) return false;
  if (solid.has(x + "," + y)) return false;
  const cell = world.grid[y][x];
  if (cell === W.FLOOR) return true;
  if (cell === W.DOOR) return doorOpen;
  return false;
}

function reach(start, doorOpen) {
  const seen = new Set([start.x + "," + start.y]);
  const queue = [start];
  while (queue.length) {
    const p = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { x: p.x + dx, y: p.y + dy };
      const key = n.x + "," + n.y;
      if (seen.has(key) || !walkable(n.x, n.y, doorOpen)) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

test("eventos, aterrissagens e focos ficam em piso livre", () => {
  const seen = new Set();
  for (const ev of world.events.values()) {
    const key = ev.x + "," + ev.y;
    assert.ok(!seen.has(key), "evento duplicado " + key);
    seen.add(key);
    assert.equal(world.grid[ev.y][ev.x], W.FLOOR, "evento fora do piso " + key);
    assert.ok(!solid.has(key), "evento sob adereço " + key);
    if (ev.landing) {
      const lk = ev.landing.x + "," + ev.landing.y;
      assert.equal(world.grid[ev.landing.y][ev.landing.x], W.FLOOR, "aterrissagem em parede " + lk);
      assert.ok(!world.events.has(lk), "aterrissagem sobre evento " + lk);
      assert.ok(!solid.has(lk), "aterrissagem sob adereço " + lk);
    }
  }
  for (const [state, p] of Object.entries(W.FOCUS)) {
    assert.equal(world.grid[p.y][p.x], W.FLOOR, "foco em parede " + state);
    assert.ok(!solid.has(p.x + "," + p.y), "foco sob adereço " + state);
  }
  assert.equal(world.grid[world.spawn.y][world.spawn.x], W.FLOOR);
});

test("a porta da doca só abre depois do lacre", () => {
  const closed = reach(world.spawn, false);
  assert.ok(closed.has("6,4"), "lacre da doca inalcançável");
  assert.ok(!closed.has("10,4"), "porta vazando");
  assert.ok(reach(world.spawn, true).has("10,4"));
});

test("todo evento de cada sala é alcançável a partir da entrada", () => {
  const rooms = [
    [world.spawn, (e) => e.y <= 12],
    [{ x: 13, y: 16 }, (e) => e.y >= 15 && e.y <= 22],
    [{ x: 13, y: 26 }, (e) => e.y >= 25 && e.y <= 31],
    [{ x: 13, y: 36 }, (e) => e.y >= 34],
  ];
  for (const [start, inRoom] of rooms) {
    const area = reach(start, true);
    for (const ev of world.events.values()) {
      if (!inRoom(ev)) continue;
      // o evento em si é piso; vizinho alcançável basta (entra-se pisando nele)
      assert.ok(area.has(ev.x + "," + ev.y), "inalcançável: " + ev.symbol + " em " + ev.x + "," + ev.y);
    }
  }
});

test("passeio mínimo pelo mapa gera a cadeia aceita abn", () => {
  const path = [];
  for (let x = 6; x <= 18; x += 1) path.push({ x, y: 4 });
  path.push({ x: 18, y: 3 });
  for (let y = 4; y <= 10; y += 1) path.push({ x: 18, y });
  for (const p of path) assert.ok(walkable(p.x, p.y, true), "bloqueado em " + p.x + "," + p.y);
  const symbols = path.filter((p) => world.events.has(p.x + "," + p.y)).map((p) => world.events.get(p.x + "," + p.y).symbol);
  assert.equal(symbols.join(""), "abn");
  assert.equal(PDA.runString(symbols.join("")).config.accepted, true);
});

test("há lacres suficientes por sala para os exemplos do trabalho", () => {
  const count = (symbol, pred) => [...world.events.values()].filter((e) => e.symbol === symbol && pred(e)).length;
  assert.ok(count("a", (e) => e.y <= 12) >= 3, "quentes na galeria");
  assert.ok(count("k", (e) => e.y <= 12) >= 2, "frios na galeria");
  assert.ok(count("k", (e) => e.y >= 15 && e.y <= 22) >= 1);
});

console.log("\n" + passed + " testes passaram");
