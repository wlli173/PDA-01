/**
 * Mapa da Usina 7 (dados puros, sem DOM).
 * Script clássico: window.VigiaWorld no navegador, module.exports no Node.
 */
(function (root) {
  "use strict";

  const COLS = 22;
  const ROWS = 40;
  const FLOOR = 1;
  const DOOR = 2;
  const DOOR_AT = { x: 9, y: 4 };

  /** Zona visual de uma célula (paleta e textura). */
  function zoneAt(x, y) {
    if (y <= 6 && x <= 9) return "dock";
    if (y <= 13) return "gallery";
    if (y <= 23) return "ring1";
    if (y <= 32) return "ring2";
    return "ring3";
  }

  /** Para onde olhar quando o PDA está em cada estado (modo roteiro). */
  const FOCUS = {
    q0: { x: 3, y: 4 },
    q1: { x: 14, y: 5 },
    q2: { x: 14, y: 17 },
    q3: { x: 14, y: 27 },
    q4: { x: 14, y: 37 },
    q5: { x: 18, y: 9 },
  };

  function createWorld() {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    const carve = (x0, y0, x1, y1) => {
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) grid[y][x] = FLOOR;
      }
    };

    carve(1, 1, 8, 6); // doca
    carve(10, 1, 20, 12); // galeria
    carve(10, 15, 20, 22); // anel 1
    carve(10, 25, 20, 31); // anel 2
    carve(10, 34, 20, 39); // anel 3
    grid[DOOR_AT.y][DOOR_AT.x] = DOOR;

    const events = new Map();
    const add = (x, y, symbol, landing) => {
      events.set(x + "," + y, { x, y, symbol, landing: landing || null });
    };

    // doca
    add(6, 4, "a");

    // galeria (q1)
    add(12, 3, "a");
    add(15, 3, "a");
    add(12, 6, "k");
    add(15, 6, "k");
    add(18, 3, "b");
    add(16, 8, "d");
    add(13, 10, "e", { x: 13, y: 16 });
    add(18, 10, "n");

    // anel 1 (q2)
    add(12, 18, "a");
    add(15, 18, "k");
    add(18, 18, "b");
    add(18, 20, "d");
    add(13, 20, "e", { x: 13, y: 26 });
    add(16, 20, "s", { x: 16, y: 10 });

    // anel 2 (q3)
    add(12, 27, "a");
    add(15, 27, "k");
    add(18, 27, "b");
    add(18, 29, "d");
    add(13, 29, "e", { x: 13, y: 36 });
    add(16, 29, "s", { x: 16, y: 19 });

    // anel 3 (q4)
    add(12, 36, "a");
    add(15, 36, "k");
    add(18, 36, "b");
    add(18, 38, "d");
    add(16, 38, "s", { x: 16, y: 28 });

    // adereços sólidos (bloqueiam o Vigia); lamp emite luz
    const decor = [
      { x: 2, y: 2, kind: "lamp" },
      { x: 4, y: 2, kind: "crate" },
      { x: 7, y: 2, kind: "crate" },
      { x: 2, y: 5, kind: "barrel" },
      { x: 11, y: 2, kind: "crate" },
      { x: 20, y: 2, kind: "barrel" },
      { x: 11, y: 9, kind: "pipe" },
      { x: 20, y: 8, kind: "barrel" },
      { x: 10, y: 11, kind: "lamp" },
      { x: 20, y: 11, kind: "lamp" },
      { x: 11, y: 16, kind: "pipe" },
      { x: 20, y: 16, kind: "barrel" },
      { x: 11, y: 22, kind: "crate" },
      { x: 20, y: 22, kind: "lamp" },
      { x: 11, y: 26, kind: "pipe" },
      { x: 20, y: 26, kind: "barrel" },
      { x: 11, y: 31, kind: "crate" },
      { x: 20, y: 31, kind: "lamp" },
      { x: 11, y: 35, kind: "pipe" },
      { x: 20, y: 35, kind: "barrel" },
      { x: 11, y: 39, kind: "crate" },
      { x: 20, y: 39, kind: "lamp" },
    ];

    return { grid, events, decor, spawn: { x: 3, y: 4 }, doorAt: DOOR_AT };
  }

  const api = { COLS, ROWS, FLOOR, DOOR, DOOR_AT, FOCUS, zoneAt, createWorld };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.VigiaWorld = api;
})(typeof window !== "undefined" ? window : globalThis);
