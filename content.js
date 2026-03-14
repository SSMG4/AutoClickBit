'use strict';

(() => {

const TARGET_COLORS = ['#e84040','#3b9eff','#f97316','#22c55e','#a855f7','#ec4899','#14b8a6','#eab308'];

const state = {
  settings: null,
  targets: [],
  keyTargets: [],
  clickTimestamps: [],
  sessionStart: null,
  stylesInjected: false,
};

let _isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
let _useMouseMode = !_isMobile;
let _mouseDetected = false;

function isRunning() {
  return state.targets.some(t => t.active) || state.keyTargets.some(t => t.active);
}

function totalClicks() {
  return state.targets.reduce((s, t) => s + t.clickCount, 0)
       + state.keyTargets.reduce((s, t) => s + t.clickCount, 0);
}

function injectStyles() {
  if (state.stylesInjected) return;
  state.stylesInjected = true;
  const s = document.createElement('style');
  s.id = 'acb-global-styles';
  s.textContent = `
    .acb-target {
      position: fixed;
      z-index: 2147483647;
      user-select: none;
      pointer-events: all;
      box-sizing: border-box;
    }
    .acb-cursor {
      width: 60px;
      height: 52px;
      cursor: grab;
    }
    .acb-cursor:active { cursor: grabbing; }
    .acb-cursor-body {
      position: absolute;
      bottom: 0;
      left: 0;
    }
    .acb-cursor-body.dim { opacity: 0.65; filter: grayscale(0.2); }
    .acb-cursor-label {
      position: absolute;
      bottom: 2px;
      left: 16px;
      font: 700 9px/1.3 ui-monospace, monospace;
      background: rgba(10,12,18,0.82);
      color: var(--c);
      border: 1.5px solid var(--c);
      padding: 1px 5px 2px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      letter-spacing: 0.06em;
    }
    .acb-cursor-hover-btns {
      position: absolute;
      top: 0;
      left: 0;
      display: flex;
      gap: 2px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.1s;
    }
    .acb-cursor:hover .acb-cursor-hover-btns {
      opacity: 1;
      pointer-events: all;
    }
    .acb-hbtn {
      font: 700 8px/1 ui-monospace, monospace;
      background: #1a1d23;
      color: #ccc;
      border: 1px solid #333;
      border-radius: 2px;
      padding: 3px 6px;
      cursor: pointer;
      letter-spacing: 0.02em;
    }
    .acb-hbtn:hover { background: var(--c); color: #fff; border-color: var(--c); }
    .acb-dot {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid var(--c);
      background: color-mix(in srgb, var(--c) 18%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      touch-action: none;
    }
    .acb-dot.acb-inactive { opacity: 0.4; filter: grayscale(0.5); }
    .acb-dot-inner {
      font: 700 10px/1 ui-monospace, monospace;
      color: var(--c);
      pointer-events: none;
      letter-spacing: 0.04em;
    }
    .acb-dot-menu {
      position: absolute;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      background: #1a1d23;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 5px;
      white-space: nowrap;
    }
    .acb-ripple {
      position: fixed;
      z-index: 2147483646;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 2px solid var(--rc, #e84040);
      pointer-events: none;
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
      animation: acb-rpl 0.3s ease-out forwards;
    }
    @keyframes acb-rpl {
      to { transform: translate(-50%, -50%) scale(4); opacity: 0; }
    }
    .acb-key-badge {
      position: fixed;
      z-index: 2147483647;
      background: rgba(10,12,18,0.88);
      border: 1.5px solid var(--bk, #3b9eff);
      border-radius: 4px;
      padding: 6px 12px;
      font: 700 13px/1 ui-monospace, monospace;
      color: var(--bk, #3b9eff);
      pointer-events: none;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transform: translate(-50%, -50%);
      animation: acb-krise 0.55s ease-out forwards;
    }
    @keyframes acb-krise {
      0%   { opacity: 1;   transform: translate(-50%, -50%); }
      60%  { opacity: 0.9; transform: translate(-50%, calc(-50% - 22px)); }
      100% { opacity: 0;   transform: translate(-50%, calc(-50% - 40px)); }
    }
  `;
  (document.head || document.documentElement).appendChild(s);
}

function cursorSVG(color) {
  return `<svg width="24" height="28" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2 L4 24 L9 18.5 L13 27 L15.5 26 L11.5 17.5 L19 17.5 Z"
      fill="${color}" stroke="#0f1117" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;
}

function buildCursorEl(id, x, y, color, index) {
  const el = document.createElement('div');
  el.className = 'acb-target acb-cursor';
  el.dataset.acbId = id;
  el.style.cssText = `left:${x}px;top:${y}px;--c:${color};`;
  el.innerHTML = `
    <div class="acb-cursor-hover-btns">
      <button class="acb-hbtn" data-a="play">▶</button>
      <button class="acb-hbtn" data-a="remove">✕</button>
    </div>
    <div class="acb-cursor-body dim">
      ${cursorSVG(color)}
      <div class="acb-cursor-label">T${index+1}</div>
    </div>
  `;

  makeDraggable(el, id, false);
  el.querySelector('[data-a="play"]').addEventListener('click', e => { e.stopPropagation(); toggleTargetActive(id); });
  el.querySelector('[data-a="remove"]').addEventListener('click', e => { e.stopPropagation(); removeTarget(id); });
  return el;
}

function buildDotEl(id, x, y, color, index) {
  const el = document.createElement('div');
  el.className = 'acb-target acb-dot acb-inactive';
  el.dataset.acbId = id;
  el.style.cssText = `left:${x}px;top:${y}px;--c:${color};`;
  el.innerHTML = `<span class="acb-dot-inner">T${index+1}</span>`;
  makeDraggable(el, id, true);
  let pressTimer;
  el.addEventListener('touchstart', () => { pressTimer = setTimeout(() => showDotMenu(id, el), 600); }, {passive:true});
  el.addEventListener('touchend',   () => clearTimeout(pressTimer));
  el.addEventListener('touchmove',  () => clearTimeout(pressTimer), {passive:true});
  return el;
}

function showDotMenu(id, el) {
  const ex = el.querySelector('.acb-dot-menu');
  if (ex) { ex.remove(); return; }
  const t = state.targets.find(t => t.id === id);
  const m = document.createElement('div');
  m.className = 'acb-dot-menu';
  m.innerHTML = `<button class="acb-hbtn" data-a="play">${t && t.active ? '⏸' : '▶'}</button><button class="acb-hbtn" data-a="remove">✕</button>`;
  m.querySelector('[data-a="play"]').addEventListener('click',   () => { toggleTargetActive(id); m.remove(); });
  m.querySelector('[data-a="remove"]').addEventListener('click', () => removeTarget(id));
  el.appendChild(m);
}

function makeDraggable(el, id, isTouch) {
  let ox = 0, oy = 0, dragging = false;
  if (!isTouch) {
    el.addEventListener('mousedown', e => {
      if (e.target.closest('.acb-hbtn')) return;
      e.preventDefault();
      dragging = true;
      const r = el.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(window.innerWidth  - 28, e.clientX - ox));
      const y = Math.max(0, Math.min(window.innerHeight - 30, e.clientY - oy));
      el.style.left = x + 'px'; el.style.top = y + 'px';
      syncTargetPos(id, x, y);
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  } else {
    el.addEventListener('touchstart', e => {
      const r = el.getBoundingClientRect(), t = e.touches[0];
      ox = t.clientX - r.left; oy = t.clientY - r.top;
      e.preventDefault();
    }, {passive:false});
    el.addEventListener('touchmove', e => {
      const t = e.touches[0];
      const x = Math.max(0, Math.min(window.innerWidth  - 48, t.clientX - ox));
      const y = Math.max(0, Math.min(window.innerHeight - 48, t.clientY - oy));
      el.style.left = x + 'px'; el.style.top = y + 'px';
      syncTargetPos(id, x, y);
      e.preventDefault();
    }, {passive:false});
  }
}

function syncTargetPos(id, x, y) {
  const t = state.targets.find(t => t.id === id);
  if (t) { t.x = x; t.y = y; }
}

function addTarget() {
  injectStyles();
  const id    = Date.now().toString(36) + Math.random().toString(36).slice(2,5);
  const idx   = state.targets.length;
  const color = TARGET_COLORS[idx % TARGET_COLORS.length];
  const cx    = _useMouseMode ? 13 : 22;
  const cy    = _useMouseMode ? 14 : 22;
  const x     = Math.max(0, Math.round(window.innerWidth / 2)  - cx);
  const y     = Math.max(0, Math.round(window.innerHeight / 2) - cy);
  const el    = _useMouseMode ? buildCursorEl(id, x, y, color, idx) : buildDotEl(id, x, y, color, idx);
  if (state.settings && state.settings.actionMode === 'key') {
    el.style.display = 'none';
  }
  document.body.appendChild(el);
  state.targets.push({ id, x, y, el, color, active: false, clickCount: 0, timerId: null });
  push();
}

function removeTarget(id) {
  const i = state.targets.findIndex(t => t.id === id);
  if (i < 0) return;
  const t = state.targets[i];
  clearTimeout(t.timerId);
  t.el.remove();
  state.targets.splice(i, 1);
  relabelTargets();
  push();
}

function removeAllTargets() {
  [...state.targets].forEach(t => { clearTimeout(t.timerId); t.el.remove(); });
  state.targets.length = 0;
  push();
}

function relabelTargets() {
  state.targets.forEach((t, i) => {
    const lbl = t.el.querySelector('.acb-cursor-label, .acb-dot-inner');
    if (lbl) lbl.textContent = 'T' + (i + 1);
  });
}

function toggleTargetActive(id) {
  const t = state.targets.find(t => t.id === id);
  if (!t || !state.settings) return;
  if (t.active) { stopTarget(t); } else {
    if (!state.sessionStart) state.sessionStart = Date.now();
    startTarget(t, state.settings);
  }
  push();
}

function startTarget(t, s) {
  if (t.active) return;
  t.active = true;
  updateTargetEl(t);
  scheduleTick(t, s);
}

function stopTarget(t) {
  t.active = false;
  clearTimeout(t.timerId); t.timerId = null;
  updateTargetEl(t);
}

function updateTargetEl(t) {
  const body = t.el.querySelector('.acb-cursor-body, .acb-dot');
  if (body) body.classList.toggle('dim', !t.active);
  if (body) body.classList.toggle('acb-inactive', !t.active);
  const playBtn = t.el.querySelector('[data-a="play"]');
  if (playBtn) playBtn.textContent = t.active ? '⏸' : '▶';
}

function addKeyTarget(key) {
  injectStyles();
  const id    = Date.now().toString(36) + Math.random().toString(36).slice(2,5);
  const idx   = state.keyTargets.length;
  const color = TARGET_COLORS[(state.targets.length + idx) % TARGET_COLORS.length];
  state.keyTargets.push({ id, key: key || 'Space', color, active: false, clickCount: 0, timerId: null });
  push();
}

function removeKeyTarget(id) {
  const i = state.keyTargets.findIndex(t => t.id === id);
  if (i < 0) return;
  clearTimeout(state.keyTargets[i].timerId);
  state.keyTargets.splice(i, 1);
  push();
}

function removeAllKeyTargets() {
  state.keyTargets.forEach(t => clearTimeout(t.timerId));
  state.keyTargets.length = 0;
  hideCenterKeyTag();
  push();
}

function toggleKeyTarget(id) {
  const t = state.keyTargets.find(t => t.id === id);
  if (!t || !state.settings) return;
  if (t.active) { stopKeyTarget(t); } else {
    if (!state.sessionStart) state.sessionStart = Date.now();
    startKeyTarget(t, state.settings);
  }
  push();
}

function startKeyTarget(t, s) {
  if (t.active) return;
  t.active = true;
  scheduleKeyTick(t, s);
}

function stopKeyTarget(t) {
  t.active = false;
  clearTimeout(t.timerId); t.timerId = null;
}

function scheduleKeyTick(t, s) {
  if (!t.active) return;
  t.timerId = setTimeout(() => {
    if (!t.active) return;
    const burst = Math.max(1, s.burst || 1);
    for (let b = 0; b < burst; b++) {
      fireKeyPress(t.key);
      const now = Date.now();
      state.clickTimestamps.push(now);
      if (state.clickTimestamps.length > 600) state.clickTimestamps.shift();
    }
    t.clickCount += burst;
    spawnKeyBadge(t.key, t.color);
    if (s.soundFx) playTick();
    if (s.repeat > 0 && t.clickCount >= s.repeat) { stopKeyTarget(t); push(); return; }
    scheduleKeyTick(t, s);
  }, jitterInterval(s));
}

const _keyBadgeOffsets = [0, -28, 28, -14, 14];
let _keyBadgeOIdx = 0;

function spawnKeyBadge(key, color) {
  const el = document.createElement('div');
  el.className = 'acb-key-badge';
  el.textContent = key === 'Space' ? '␣' : key;
  const cx = window.innerWidth  / 2 + _keyBadgeOffsets[_keyBadgeOIdx % _keyBadgeOffsets.length];
  _keyBadgeOIdx++;
  el.style.cssText = `left:${cx}px;top:50%;--bk:${color};`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function hideCenterKeyTag() {}

function jitterInterval(s) {
  const base = Math.max(1, s.intervalMs);
  if (!s.jitter) return Math.round(base);
  const r = base * (s.jitter / 100);
  if (s.humanize) {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(1, Math.round(base + g * (r / 2)));
  }
  return Math.max(1, Math.round(base + (Math.random() * 2 - 1) * r));
}

function scheduleTick(t, s) {
  if (!t.active) return;
  t.timerId = setTimeout(() => {
    if (!t.active) return;
    const burst = Math.max(1, s.burst || 1);
    for (let b = 0; b < burst; b++) fireMouseAction(t, s);
    t.clickCount += burst;
    if (s.repeat > 0 && t.clickCount >= s.repeat) { stopTarget(t); push(); return; }
    scheduleTick(t, s);
  }, jitterInterval(s));
}

function fireMouseAction(t, s) {
  const now = Date.now();
  state.clickTimestamps.push(now);
  if (state.clickTimestamps.length > 600) state.clickTimestamps.shift();

  const cx = t.x + (_useMouseMode ? 12 : 22);
  const cy = t.y + (_useMouseMode ? 38 : 22);

  const overlays = document.querySelectorAll('.acb-target');
  overlays.forEach(o => { o.style.pointerEvents = 'none'; });
  const el = document.elementFromPoint(cx, cy);
  overlays.forEach(o => { o.style.pointerEvents = 'all'; });
  if (!el) return;
  if (s.ignoreHidden && !isVisible(el)) return;

  const base = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy,
    screenX: cx + (window.screenX||0), screenY: cy + (window.screenY||0) };
  const fire = (type, extra = {}) => el.dispatchEvent(new MouseEvent(type, {...base, ...extra}));

  if (s.clickType === 'right') {
    fire('mousedown', {button:2, buttons:2});
    fire('mouseup',   {button:2, buttons:0});
    fire('contextmenu', {button:2});
  } else if (s.clickType === 'middle') {
    fire('mousedown', {button:1, buttons:4});
    fire('mouseup',   {button:1, buttons:0});
    fire('auxclick',  {button:1});
  } else if (s.clickType === 'double') {
    fire('mousedown', {button:0, buttons:1});
    fire('mouseup',   {button:0, buttons:0});
    fire('click',     {button:0, detail:1});
    fire('mousedown', {button:0, buttons:1});
    fire('mouseup',   {button:0, buttons:0});
    fire('click',     {button:0, detail:2});
    fire('dblclick',  {button:0, detail:2});
  } else {
    if (s.holdMs > 0) {
      fire('mousedown', {button:0, buttons:1});
      setTimeout(() => { fire('mouseup', {button:0, buttons:0}); fire('click', {button:0}); }, s.holdMs);
    } else {
      fire('mousedown', {button:0, buttons:1});
      fire('mouseup',   {button:0, buttons:0});
      fire('click',     {button:0});
    }
  }

  spawnRipple(cx, cy, s.clickType, t.color);
  if (s.soundFx) playTick();
}

function fireKeyPress(key) {
  const el = document.activeElement || document.body;
  const code   = keyToCode(key);
  const kc     = keyToKeyCode(key);
  const isChar = key.length === 1;
  const init   = { bubbles: true, cancelable: true, key, code, keyCode: kc, which: kc };
  el.dispatchEvent(new KeyboardEvent('keydown',  init));
  if (isChar) el.dispatchEvent(new KeyboardEvent('keypress', init));
  el.dispatchEvent(new KeyboardEvent('keyup',    init));
}

function keyToCode(key) {
  if (key === 'Space')      return 'Space';
  if (key === 'Enter')      return 'Enter';
  if (key === 'Escape')     return 'Escape';
  if (key === 'Tab')        return 'Tab';
  if (key === 'ArrowUp')    return 'ArrowUp';
  if (key === 'ArrowDown')  return 'ArrowDown';
  if (key === 'ArrowLeft')  return 'ArrowLeft';
  if (key === 'ArrowRight') return 'ArrowRight';
  if (/^[a-zA-Z]$/.test(key)) return 'Key' + key.toUpperCase();
  if (/^[0-9]$/.test(key))    return 'Digit' + key;
  return key;
}

function keyToKeyCode(key) {
  if (key === 'Space')  return 32;
  if (key === 'Enter')  return 13;
  if (key === 'Escape') return 27;
  if (key === 'Tab')    return 9;
  if (/^[A-Za-z]$/.test(key)) return key.toUpperCase().charCodeAt(0);
  if (/^[0-9]$/.test(key))    return 48 + parseInt(key);
  return 0;
}

function isVisible(el) {
  if (!el) return false;
  const s = window.getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function spawnRipple(x, y, clickType, targetColor) {
  const el = document.createElement('div');
  el.className = 'acb-ripple';
  const c = clickType === 'right' ? '#f97316' : clickType === 'middle' ? '#a855f7' : (targetColor || '#e84040');
  el.style.cssText = `left:${x}px;top:${y}px;--rc:${c};`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

let _audioCtx;
function playTick() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const sr  = ctx.sampleRate;
    const dur = 0.012;
    const buf = ctx.createBuffer(1, Math.ceil(sr * dur), sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / d.length;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 6) * 0.9;
    }
    const src  = ctx.createBufferSource();
    const filt = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filt.type = 'bandpass';
    filt.frequency.value = 3200;
    filt.Q.value = 0.8;
    gain.gain.setValueAtTime(0.55, ctx.currentTime);
    src.buffer = buf;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch(_) {}
}

function push() {
  const now = Date.now();
  const cutoff = now - 3000;
  while (state.clickTimestamps.length && state.clickTimestamps[0] < cutoff) state.clickTimestamps.shift();
  const cps = Math.round((state.clickTimestamps.length / 3) * 10) / 10;
  try {
    chrome.runtime.sendMessage({
      type: 'ACB_STATE',
      running: isRunning(),
      targets: state.targets.map((t, i) => ({
        id: t.id, color: t.color, active: t.active,
        clickCount: t.clickCount, x: Math.round(t.x), y: Math.round(t.y), idx: i,
      })),
      keyTargets: state.keyTargets.map((t, i) => ({
        id: t.id, key: t.key, color: t.color, active: t.active, clickCount: t.clickCount, idx: i,
      })),
      totalClicks: totalClicks(),
      sessionMs: state.sessionStart ? now - state.sessionStart : 0,
      cps,
    });
  } catch(_) {}
}

document.addEventListener('mousemove', () => {
  if (_mouseDetected || !_isMobile) return;
  _mouseDetected = true;
  _useMouseMode = true;
  const inKeyMode = state.settings && state.settings.actionMode === 'key';
  state.targets.forEach((t, i) => {
    const newEl = buildCursorEl(t.id, t.x, t.y, t.color, i);
    if (inKeyMode) newEl.style.display = 'none';
    t.el.replaceWith(newEl);
    t.el = newEl;
    updateTargetEl(t);
  });
  push();
}, {passive: true});

document.addEventListener('keydown', e => {
  if (!state.settings) return;
  const hotkey = state.settings.hotkey || '';
  if (!hotkey) return;
  const parts = [];
  if (e.ctrlKey  && hotkey.includes('Ctrl'))  parts.push('Ctrl');
  if (e.shiftKey && hotkey.includes('Shift')) parts.push('Shift');
  if (e.altKey   && hotkey.includes('Alt'))   parts.push('Alt');
  parts.push(e.key);
  if (parts.join('+') === hotkey || e.key === hotkey) {
    if (isRunning()) {
      state.targets.forEach(t => stopTarget(t));
      state.keyTargets.forEach(t => stopKeyTarget(t));
      hideCenterKeyTag();
    } else {
      if (!state.sessionStart) state.sessionStart = Date.now();
      if (state.settings.actionMode === 'key') {
        state.keyTargets.forEach(t => startKeyTarget(t, state.settings));
      } else {
        state.targets.forEach(t => startTarget(t, state.settings));
      }
    }
    push();
  }
}, true);

setInterval(() => { if (isRunning()) push(); }, 200);

chrome.runtime.onMessage.addListener((msg, _s, resp) => {
  switch (msg.type) {

    case 'ACB_ADD_TARGET':
      state.settings = msg.settings || state.settings;
      addTarget();
      resp({ok:true});
      break;

    case 'ACB_REMOVE_TARGET':
      removeTarget(msg.id);
      resp({ok:true});
      break;

    case 'ACB_REMOVE_ALL':
      removeAllTargets();
      resp({ok:true});
      break;

    case 'ACB_TOGGLE_ACTIVE':
      toggleTargetActive(msg.id);
      resp({ok:true});
      break;

    case 'ACB_ADD_KEY_TARGET':
      addKeyTarget(msg.key);
      resp({ok:true});
      break;

    case 'ACB_REMOVE_KEY_TARGET':
      removeKeyTarget(msg.id);
      resp({ok:true});
      break;

    case 'ACB_REMOVE_ALL_KEY':
      removeAllKeyTargets();
      resp({ok:true});
      break;

    case 'ACB_TOGGLE_KEY_TARGET':
      toggleKeyTarget(msg.id);
      resp({ok:true});
      break;

    case 'ACB_UPDATE_KEY_TARGET': {
      const kt = state.keyTargets.find(t => t.id === msg.id);
      if (kt) kt.key = msg.key;
      resp({ok:true});
      break;
    }

    case 'ACB_SET_MODE':
      if (msg.mode === 'key') {
        state.targets.forEach(t => { stopTarget(t); t.el.style.display = 'none'; });
        state.keyTargets.forEach(t => stopKeyTarget(t));
      } else {
        state.targets.forEach(t => { t.el.style.display = ''; });
        state.keyTargets.forEach(t => stopKeyTarget(t));
        hideCenterKeyTag();
      }
      push();
      resp({ok:true});
      break;

    case 'ACB_START_ALL':
      state.settings = msg.settings;
      if (!state.sessionStart) state.sessionStart = Date.now();
      if (msg.settings.actionMode === 'key') {
        state.keyTargets.forEach(t => startKeyTarget(t, state.settings));
      } else {
        state.targets.forEach(t => startTarget(t, state.settings));
      }
      push();
      resp({ok:true});
      break;

    case 'ACB_STOP_ALL':
      state.targets.forEach(t => stopTarget(t));
      state.keyTargets.forEach(t => stopKeyTarget(t));
      hideCenterKeyTag();
      push();
      resp({ok:true});
      break;

    case 'ACB_UPDATE_SETTINGS':
      state.settings = msg.settings;
      state.targets.forEach(t => {
        if (t.active) { stopTarget(t); startTarget(t, state.settings); }
      });
      state.keyTargets.forEach(t => {
        if (t.active) { stopKeyTarget(t); startKeyTarget(t, state.settings); }
      });
      resp({ok:true});
      break;

    case 'ACB_GET_STATE': {
      const now = Date.now();
      const cutoff = now - 3000;
      while (state.clickTimestamps.length && state.clickTimestamps[0] < cutoff) state.clickTimestamps.shift();
      resp({
        running: isRunning(),
        targets: state.targets.map((t, i) => ({
          id: t.id, color: t.color, active: t.active,
          clickCount: t.clickCount, x: Math.round(t.x), y: Math.round(t.y), idx: i,
        })),
        keyTargets: state.keyTargets.map((t, i) => ({
          id: t.id, key: t.key, color: t.color, active: t.active, clickCount: t.clickCount, idx: i,
        })),
        totalClicks: totalClicks(),
        sessionMs: state.sessionStart ? now - state.sessionStart : 0,
        cps: Math.round((state.clickTimestamps.length / 3) * 10) / 10,
      });
      break;
    }

    case 'ACB_RESET_STATS':
      state.clickTimestamps.length = 0;
      state.sessionStart = isRunning() ? Date.now() : null;
      state.targets.forEach(t => { t.clickCount = 0; });
      state.keyTargets.forEach(t => { t.clickCount = 0; });
      push();
      resp({ok:true});
      break;
  }
  return true;
});

chrome.runtime.sendMessage({ type: 'ACB_CONTENT_READY' }).catch(() => {});

})();
