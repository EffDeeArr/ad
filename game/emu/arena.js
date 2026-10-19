'use strict';
/* Runs the player's own copy of a DOS game (The Elder Scrolls: Arena) inside DOSBox compiled to WebAssembly (js-dos "emulators", GPL-2.0, see THIRD-PARTY-NOTICES.txt).
   This page lives in an iframe of the game. The game window hands it the emulator files and the game files as raw bytes (nothing is downloaded), and it hands back
   the changed files (saved games) when the player leaves. */
(() => {
  const cv = document.getElementById('cv'), cx = cv.getContext('2d');
  const post = (m, tr) => { try { parent.postMessage(m, '*', tr || []); } catch (e) {} };
  let ci = null, ac = null, gain = null, nextT = 0, img = null, W = 320, H = 200, started = false, stopping = false;
  const down = new Set();

  // the emulator library fetches its own files with XMLHttpRequest; serve them from memory instead
  function shim(files) {
    window.XMLHttpRequest = function () {
      let url = '', rt = '';
      const self = this;
      self.readyState = 0; self.status = 0; self.response = null; self.onreadystatechange = null;
      self.open = (m, u) => { url = String(u); };
      self.overrideMimeType = () => {}; self.setRequestHeader = () => {}; self.addEventListener = () => {};
      Object.defineProperty(self, 'responseType', { get: () => rt, set: v => { rt = v; } });
      self.send = () => setTimeout(() => {
        const n = url.split('?')[0].split('/').pop(), f = files[n];
        if (f === undefined) { self.status = 404; self.response = null; }
        else { self.status = 200; self.response = rt === 'arraybuffer' ? (typeof f === 'string' ? new TextEncoder().encode(f).buffer : f) : (typeof f === 'string' ? f : new TextDecoder().decode(f)); }
        self.readyState = 4;
        if (self.onreadystatechange) self.onreadystatechange();
      }, 0);
    };
  }

  // DOM key code -> the key numbers the emulator expects (GLFW style)
  const KM = { Escape: 256, Enter: 257, Tab: 258, Backspace: 259, Insert: 260, Delete: 261, ArrowRight: 262, ArrowLeft: 263, ArrowDown: 264, ArrowUp: 265, PageUp: 266, PageDown: 267, Home: 268, End: 269,
    CapsLock: 280, ScrollLock: 281, NumLock: 282, PrintScreen: 283, Pause: 284, ShiftLeft: 340, ControlLeft: 341, AltLeft: 342, ShiftRight: 344, ControlRight: 345, AltRight: 346,
    Space: 32, Quote: 39, Comma: 44, Minus: 45, Period: 46, Slash: 47, Semicolon: 59, Equal: 61, BracketLeft: 91, Backslash: 92, BracketRight: 93, Backquote: 96,
    NumpadDecimal: 330, NumpadDivide: 331, NumpadMultiply: 332, NumpadSubtract: 333, NumpadAdd: 334, NumpadEnter: 335, IntlBackslash: 348 };
  for (let i = 0; i < 26; i++) KM['Key' + String.fromCharCode(65 + i)] = 65 + i;
  for (let i = 0; i < 10; i++) { KM['Digit' + i] = 48 + i; KM['Numpad' + i] = 320 + i; }
  for (let i = 1; i <= 12; i++) KM['F' + i] = 289 + i;

  function sound(s) {
    if (!ac || !s || !s.length) return;
    const b = ac.createBuffer(1, s.length, ac.sampleRate); b.copyToChannel(s, 0);
    const src = ac.createBufferSource(); src.buffer = b; src.connect(gain);
    let t = Math.max(ac.currentTime + 0.06, nextT);
    if (t - ac.currentTime > 0.6) t = ac.currentTime + 0.06;   // fell behind: drop the backlog
    src.start(t); nextT = t + b.duration;
  }

  function fit() {
    const asp = (H === 200 || H === 400) ? 4 / 3 : W / H;   // 320x200 was meant for a 4:3 monitor
    const vw = innerWidth, vh = innerHeight;
    let w = vw, h = vw / asp;
    if (h > vh) { h = vh; w = vh * asp; }
    cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(h) + 'px';
  }
  addEventListener('resize', fit);

  // The emulator announces a frame before it has finished drawing it, so the pixels are read a moment later (after the emulator has yielded).
  let pend = null, timer = 0;
  function paint() {
    timer = 0;
    const rgb = pend && pend[0], rgba = pend && pend[1]; pend = null;
    if (!img || img.width !== W || img.height !== H) { cv.width = W; cv.height = H; img = cx.createImageData(W, H); fit(); }
    const d = img.data;
    if (rgba && rgba.length >= d.length) d.set(rgba.length === d.length ? rgba : rgba.subarray(0, d.length));
    else if (rgb && rgb.length >= W * H * 3) { for (let i = 0, j = 0, n = W * H; i < n; i++, j += 3) { d[i * 4] = rgb[j]; d[i * 4 + 1] = rgb[j + 1]; d[i * 4 + 2] = rgb[j + 2]; d[i * 4 + 3] = 255; } }
    else return;
    if (rgba) for (let i = 3; i < d.length; i += 4) d[i] = 255;
    cx.putImageData(img, 0, 0);
    if (!started) { started = true; post({ t: 'started' }); }
  }
  function frame(rgb, rgba) { pend = [rgb, rgba]; if (!timer) timer = setTimeout(paint, 0); }

  const mpos = e => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
  const btn = b => b === 2 ? 1 : b === 1 ? 2 : 0;   // DOM: 0 left 1 middle 2 right -> DOSBox: 0 left 1 right 2 middle

  function wake() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); cv.focus(); }
  addEventListener('keydown', e => {
    if (!ci) return;
    if (e.code === 'F12') { e.preventDefault(); post({ t: 'exit' }); return; }
    const k = KM[e.code]; if (k === undefined) return;
    e.preventDefault(); wake(); down.add(k); ci.sendKeyEvent(k, true);
  }, true);
  addEventListener('keyup', e => {
    if (!ci) return;
    const k = KM[e.code]; if (k === undefined) return;
    e.preventDefault(); down.delete(k); ci.sendKeyEvent(k, false);
  }, true);
  addEventListener('blur', () => { if (ci) for (const k of down) ci.sendKeyEvent(k, false); down.clear(); });
  cv.addEventListener('mousemove', e => { if (ci) { const p = mpos(e); ci.sendMouseMotion(p[0], p[1]); } });
  cv.addEventListener('mousedown', e => { e.preventDefault(); wake(); if (ci) { const p = mpos(e); ci.sendMouseMotion(p[0], p[1]); ci.sendMouseButton(btn(e.button), true); } });
  addEventListener('mouseup', e => { if (ci) ci.sendMouseButton(btn(e.button), false); });
  cv.addEventListener('contextmenu', e => e.preventDefault());

  async function start(m) {
    try {
      shim(m.files);
      emulators.pathPrefix = 'e/';
      const bundles = m.bundles.map(b => new Uint8Array(b));
      ci = await emulators.dosboxDirect(bundles.length === 1 ? bundles[0] : bundles);
      const ev = ci.events();
      W = ci.width() || 320; H = ci.height() || 200;
      ev.onFrameSize((w, h) => { W = w; H = h; });
      ev.onFrame(frame);
      ev.onExit(() => post({ t: 'exit' }));
      ev.onMessage((ty, ...a) => post({ t: 'log', msg: ty + ': ' + a.join(' ') }));
      ev.onStdout(s => post({ t: 'log', msg: 'out: ' + s }));
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: ci.soundFrequency() || 44100 });
        gain = ac.createGain(); gain.gain.value = 0.9; gain.connect(ac.destination);
        ev.onSoundPush(sound);
      } catch (e) { ac = null; }
      wake();
    } catch (e) { post({ t: 'error', msg: String(e && e.message || e) }); }
  }

  async function stop(save) {
    if (stopping) return; stopping = true;
    let data = null;
    try { if (ci && save) { const u = await ci.persist(); if (u && u.length) { data = u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); } } } catch (e) {}
    try { if (ci) await ci.exit(); } catch (e) {}
    try { if (ac) ac.close(); } catch (e) {}
    ci = null;
    post({ t: 'stopped', data }, data ? [data] : []);
  }

  addEventListener('message', e => {
    if (e.source !== parent) return;
    const m = e.data; if (!m || typeof m !== 'object') return;
    if (m.t === 'start') start(m);
    else if (m.t === 'stop') stop(!!m.save);
    else if (m.t === 'focus') wake();
  });
  post({ t: 'ready' });
})();
