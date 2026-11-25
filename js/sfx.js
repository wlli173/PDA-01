/**
 * Sons sintéticos (Web Audio API) — sem arquivos externos.
 * Expõe window.VigiaSFX. Mudo persiste em localStorage (chave vigia7-mute).
 */
(function (root) {
  "use strict";

  const KEY = "vigia7-mute";
  let ctx = null;
  let master = null;
  let muted = false;

  try {
    muted = root.localStorage && root.localStorage.getItem(KEY) === "1";
  } catch (e) {
    muted = false;
  }

  function AudioCtx() {
    return root.AudioContext || root.webkitAudioContext;
  }

  function ensure() {
    const Ctor = AudioCtx();
    if (!Ctor) return null;
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function unlock() {
    ensure();
  }

  function tone(freq, dur, type, gain, when, slideTo) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = (when || 0) + ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, gain, when) {
    const ac = ensure();
    if (!ac || muted) return;
    const t0 = (when || 0) + ac.currentTime;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    src.buffer = buffer;
    g.gain.setValueAtTime(gain || 0.08, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const FX = {
    step: function () {
      noise(0.05, 0.05);
      tone(110, 0.04, "triangle", 0.04);
    },
    push: function () {
      tone(220, 0.08, "square", 0.09, 0, 440);
      tone(440, 0.06, "square", 0.05, 0.05);
    },
    pop: function () {
      tone(420, 0.09, "square", 0.09, 0, 180);
    },
    enter: function () {
      tone(180, 0.1, "sawtooth", 0.07);
      tone(270, 0.12, "sawtooth", 0.06, 0.07);
      tone(360, 0.14, "sawtooth", 0.05, 0.14);
    },
    seal: function () {
      tone(360, 0.08, "triangle", 0.07);
      tone(240, 0.1, "triangle", 0.06, 0.06);
    },
    valve: function () {
      tone(160, 0.08, "square", 0.06);
      tone(200, 0.1, "square", 0.07, 0.06);
      tone(320, 0.16, "square", 0.08, 0.14);
    },
    accept: function () {
      tone(392, 0.12, "square", 0.09);
      tone(523, 0.14, "square", 0.09, 0.1);
      tone(659, 0.22, "square", 0.1, 0.22);
    },
    reject: function () {
      tone(180, 0.18, "sawtooth", 0.11, 0, 70);
      noise(0.16, 0.1, 0.02);
    },
    reset: function () {
      tone(300, 0.06, "triangle", 0.05);
      tone(200, 0.08, "triangle", 0.04, 0.05);
    },
    ui: function () {
      tone(660, 0.04, "square", 0.04);
    },
  };

  const BY_SYMBOL = {
    a: "push",
    k: "push",
    b: "pop",
    d: "pop",
    e: "enter",
    s: "seal",
    n: "valve",
  };

  function play(name) {
    if (muted) return;
    const fn = FX[name];
    if (fn) fn();
  }

  function playStep(step) {
    if (!step || step.ignored) return;
    if (!step.ok) {
      play("reject");
      return;
    }
    play(BY_SYMBOL[step.symbol] || "ui");
  }

  function setMuted(value) {
    muted = Boolean(value);
    try {
      if (root.localStorage) root.localStorage.setItem(KEY, muted ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
    if (!muted) unlock();
  }

  function toggle() {
    setMuted(!muted);
    return muted;
  }

  function isMuted() {
    return muted;
  }

  root.VigiaSFX = {
    play: play,
    playStep: playStep,
    setMuted: setMuted,
    toggle: toggle,
    isMuted: isMuted,
    unlock: unlock,
  };

  root.addEventListener(
    "pointerdown",
    function once() {
      unlock();
      root.removeEventListener("pointerdown", once, true);
    },
    true,
  );
  root.addEventListener(
    "keydown",
    function onceKey() {
      unlock();
      root.removeEventListener("keydown", onceKey, true);
    },
    true,
  );
})(window);
