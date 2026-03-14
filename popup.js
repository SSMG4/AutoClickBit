'use strict';

const browser = globalThis.browser || globalThis.chrome;

const DEFAULTS = {
  clickType:    'left',
  actionMode:   'mouse',
  keyToPress:   'Space',
  intervalMs:   100,
  jitter:       0,
  repeat:       -1,
  holdMs:       0,
  burst:        1,
  humanize:     false,
  ignoreHidden: true,
  hotkey:       'F8',
  soundFx:      false,
  inputMode:    'ms',
};

let S          = { ...DEFAULTS };
let targets    = [];
let keyTargets = [];
let statsCache = { totalClicks: 0, sessionMs: 0, cps: 0 };
let anyRunning = false;
let pollTimer  = null;

let _renderedMode = null;
let _renderedIds  = '';

const $ = id => document.getElementById(id);

const dom = {
  masterBtn:      $('masterBtn'),
  masterIcon:     $('masterIcon'),
  startBtn:       $('startBtn'),
  startIcon:      $('startIcon'),
  runIndicator:   $('runIndicator'),
  footerTxt:      $('footerTxt'),

  actionModeGroup: $('actionModeGroup'),
  mouseOptions:    $('mouseOptions'),
  keyOptions:      $('keyOptions'),
  clickTypeGroup:  $('clickTypeGroup'),
  keyInput:        $('keyInput'),
  clearKeyBtn:     $('clearKeyBtn'),

  inputModeGroup:  $('inputModeGroup'),
  intervalInput:   $('intervalInput'),
  intervalSlider:  $('intervalSlider'),
  iDown:           $('iDown'),
  iUp:             $('iUp'),
  intervalWarn:    $('intervalWarn'),

  jitterSlider: $('jitterSlider'),
  jitterVal:    $('jitterVal'),
  holdSlider:   $('holdSlider'),
  holdVal:      $('holdVal'),

  rptInf:   $('rptInf'),
  rptFixed: $('rptFixed'),
  rptCount: $('rptCount'),

  burstSlider:     $('burstSlider'),
  burstVal:        $('burstVal'),
  hotkeyInput:     $('hotkeyInput'),
  clearHotkeyBtn:  $('clearHotkeyBtn'),
  humanizeChk:     $('humanizeChk'),
  ignoreHiddenChk: $('ignoreHiddenChk'),
  soundFxChk:      $('soundFxChk'),
  resetBtn:        $('resetBtn'),

  addTargetBtn: $('addTargetBtn'),
  addTargetLbl: $('addTargetLbl'),
  clearAllBtn:  $('clearAllBtn'),
  targetList:   $('targetList'),
  emptyMsg:     $('emptyMsg'),

  sTotalClicks:  $('sTotalClicks'),
  sCPS:          $('sCPS'),
  sTime:         $('sTime'),
  sTargets:      $('sTargets'),
  sInterval:     $('sInterval'),
  resetStatsBtn: $('resetStatsBtn'),
};

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('tab-' + t.dataset.tab).classList.add('active');
    browser.storage.local.set({ lastTab: t.dataset.tab });
  });
});

function setSegActive(group, val) {
  group.querySelectorAll('.seg').forEach(b => b.classList.toggle('active', b.dataset.v === val));
}

function initSeg(group, cb) {
  group.querySelectorAll('.seg').forEach(b => {
    b.addEventListener('click', () => { setSegActive(group, b.dataset.v); cb(b.dataset.v); });
  });
}

function applyUI() {
  setSegActive(dom.actionModeGroup, S.actionMode);
  dom.mouseOptions.style.display = S.actionMode === 'mouse' ? '' : 'none';
  dom.keyOptions.style.display   = S.actionMode === 'key'   ? '' : 'none';
  setSegActive(dom.clickTypeGroup, S.clickType);
  dom.keyInput.value = S.keyToPress || 'Space';
  setSegActive(dom.inputModeGroup, S.inputMode);
  syncIntervalDisplay();

  dom.jitterSlider.value = S.jitter;
  dom.jitterVal.textContent = S.jitter + '%';
  dom.holdSlider.value = S.holdMs;
  dom.holdVal.textContent = S.holdMs > 0 ? S.holdMs + ' ms' : 'off';

  const fixed = S.repeat > 0;
  dom.rptInf.classList.toggle('active', !fixed);
  dom.rptFixed.classList.toggle('active', fixed);
  dom.rptCount.disabled = !fixed;
  if (fixed) dom.rptCount.value = S.repeat;

  dom.burstSlider.value = S.burst;
  dom.burstVal.textContent = S.burst;

  dom.hotkeyInput.value = S.hotkey;
  dom.humanizeChk.checked     = S.humanize;
  dom.ignoreHiddenChk.checked = S.ignoreHidden;
  dom.soundFxChk.checked      = S.soundFx;

  checkIntervalWarn();
  syncIntervalStat();
  updateAddBtnLabel();
  updateMasterBtnIcon();
  dom.startBtn.classList.toggle('hidden', S.actionMode === 'key');
}

function updateAddBtnLabel() {
  if (dom.addTargetLbl) dom.addTargetLbl.textContent = S.actionMode === 'key' ? 'Add Key' : 'Add Target';
}

function syncIntervalDisplay() {
  if (S.inputMode === 'cps') {
    const cps = 1000 / S.intervalMs;
    dom.intervalInput.value  = cps >= 10 ? cps.toFixed(1) : cps.toFixed(2);
    dom.intervalInput.min    = 0.1;
    dom.intervalInput.max    = 200;
    dom.intervalInput.step   = 0.1;
    dom.intervalSlider.min   = 1;
    dom.intervalSlider.max   = 200;
    dom.intervalSlider.value = Math.min(200, Math.max(1, Math.round(cps)));
  } else {
    dom.intervalInput.value  = Math.round(S.intervalMs);
    dom.intervalInput.min    = 1;
    dom.intervalInput.max    = 60000;
    dom.intervalInput.step   = 1;
    dom.intervalSlider.min   = 1;
    dom.intervalSlider.max   = 2000;
    dom.intervalSlider.value = Math.min(2000, Math.round(S.intervalMs));
  }
}

function parseIntervalInput(v) {
  const n = parseFloat(v);
  if (!n || n <= 0) return S.intervalMs;
  if (S.inputMode === 'cps') return Math.max(0.5, 1000 / n);
  return Math.max(1, Math.round(n));
}

function checkIntervalWarn() {
  dom.intervalWarn.classList.toggle('show', S.intervalMs <= 40);
}

function syncIntervalStat() {
  dom.sInterval.textContent = S.inputMode === 'cps'
    ? (1000 / S.intervalMs).toFixed(1) + '/s'
    : S.intervalMs + 'ms';
}

function save() { browser.storage.local.set({ settings: S }); }
function saveAndPush() { save(); msgContent({ type: 'ACB_UPDATE_SETTINGS', settings: S }); }

async function msgContent(msg) {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    return await browser.tabs.sendMessage(tab.id, msg);
  } catch (_) {
    return null;
  }
}

let _defaultKeyAdded = false;

function applyState(res) {
  if (!res) return;
  anyRunning  = res.running;
  targets     = res.targets    || [];
  keyTargets  = res.keyTargets || [];
  statsCache  = { totalClicks: res.totalClicks || 0, sessionMs: res.sessionMs || 0, cps: res.cps || 0 };

  if (S.actionMode === 'key' && keyTargets.length === 0 && !anyRunning && !_defaultKeyAdded) {
    _defaultKeyAdded = true;
    msgContent({ type: 'ACB_ADD_KEY_TARGET', key: S.keyToPress || 'Space' });
  }
  if (keyTargets.length > 0) _defaultKeyAdded = false;

  updateRunUI();
  renderTargets();
  renderStats();
}

function updateRunUI() {
  dom.runIndicator.classList.toggle('on', anyRunning);
  dom.footerTxt.classList.toggle('on', anyRunning);
  dom.footerTxt.textContent = anyRunning ? 'Running' : 'Idle';
  if (S.actionMode === 'mouse') {
    dom.masterBtn.classList.remove('stop');
    dom.startBtn.classList.toggle('running', anyRunning);
  } else {
    dom.masterBtn.classList.toggle('stop', anyRunning);
    dom.startBtn.classList.remove('running');
  }
  updateMasterBtnIcon();
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function setSVGIcon(svgEl, type) {
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  if (type === 'pause') {
    svgEl.appendChild(svgEl_(svgEl,'rect',{x:4,y:4,width:3,height:8,rx:1,fill:'currentColor'}));
    svgEl.appendChild(svgEl_(svgEl,'rect',{x:9,y:4,width:3,height:8,rx:1,fill:'currentColor'}));
  } else if (type === 'play') {
    svgEl.appendChild(svgEl_(svgEl,'path',{d:'M5 3.5 L13 8 L5 12.5 Z',fill:'currentColor'}));
  } else if (type === 'crosshair') {
    svgEl.appendChild(svgEl_(svgEl,'line',{x1:8,y1:1,x2:8,y2:5,stroke:'currentColor','stroke-width':1.8,'stroke-linecap':'round'}));
    svgEl.appendChild(svgEl_(svgEl,'line',{x1:8,y1:11,x2:8,y2:15,stroke:'currentColor','stroke-width':1.8,'stroke-linecap':'round'}));
    svgEl.appendChild(svgEl_(svgEl,'line',{x1:1,y1:8,x2:5,y2:8,stroke:'currentColor','stroke-width':1.8,'stroke-linecap':'round'}));
    svgEl.appendChild(svgEl_(svgEl,'line',{x1:11,y1:8,x2:15,y2:8,stroke:'currentColor','stroke-width':1.8,'stroke-linecap':'round'}));
    svgEl.appendChild(svgEl_(svgEl,'circle',{cx:8,cy:8,r:2.5,fill:'currentColor'}));
  }
}

function svgEl_(parent, tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function updateMasterBtnIcon() {
  const isKey = S.actionMode === 'key';
  dom.startBtn.classList.toggle('hidden', isKey);

  if (isKey) {
    setSVGIcon(dom.masterIcon, anyRunning ? 'pause' : 'play');
  } else {
    setSVGIcon(dom.masterIcon, 'crosshair');
    setSVGIcon(dom.startIcon, anyRunning ? 'pause' : 'play');
  }
}

function renderTargets() {
  const isKey = S.actionMode === 'key';
  const list  = isKey ? keyTargets : targets;
  const newIds = list.map(t => t.id).join(',');

  if (_renderedMode === S.actionMode && _renderedIds === newIds) {
    list.forEach(t => {
      const card = dom.targetList.querySelector(`.tcard[data-id="${t.id}"]`);
      if (!card) return;
      card.classList.toggle('inactive', !t.active);
      const clicks = card.querySelector('.tcard-clicks');
      if (clicks) clicks.textContent = fmt(t.clickCount);
      const btn = card.querySelector('[data-act="toggle"]');
      if (btn) { btn.textContent = t.active ? '⏸' : '▶'; btn.classList.toggle('active', t.active); }
      if (!isKey) {
        const meta = card.querySelector('.tcard-meta');
        if (meta) meta.textContent = `${t.x}, ${t.y} px`;
      }
    });
    dom.sTargets.textContent = list.filter(t => t.active).length;
    dom.emptyMsg.style.display = list.length === 0 ? '' : 'none';
    return;
  }

  _renderedMode = S.actionMode;
  _renderedIds  = newIds;

  dom.targetList.querySelectorAll('.tcard').forEach(c => c.remove());
  dom.emptyMsg.style.display = list.length === 0 ? '' : 'none';
  list.forEach((t, i) => dom.targetList.appendChild(isKey ? makeKeyCard(t, i) : makeMouseCard(t, i)));
  dom.sTargets.textContent = list.filter(t => t.active).length;
}

function makeMouseCard(t, i) {
  const card = document.createElement('div');
  card.className = 'tcard' + (t.active ? '' : ' inactive');
  card.dataset.id = t.id;

  const dot = document.createElement('div');
  dot.className = 'tcard-dot';
  dot.style.background = t.color;

  const info = document.createElement('div');
  info.className = 'tcard-info';
  const name = document.createElement('div');
  name.className = 'tcard-name';
  name.textContent = 'Target ' + (i + 1);
  const meta = document.createElement('div');
  meta.className = 'tcard-meta';
  meta.textContent = t.x + ', ' + t.y + ' px';
  info.appendChild(name);
  info.appendChild(meta);

  const clicks = document.createElement('span');
  clicks.className = 'tcard-clicks';
  clicks.textContent = fmt(t.clickCount);

  const btns = document.createElement('div');
  btns.className = 'tcard-btns';
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'icon-btn' + (t.active ? ' active' : '');
  toggleBtn.dataset.act = 'toggle';
  toggleBtn.textContent = t.active ? '⏸' : '▶';
  const removeBtn = document.createElement('button');
  removeBtn.className = 'icon-btn rm';
  removeBtn.dataset.act = 'remove';
  removeBtn.textContent = '✕';
  btns.appendChild(toggleBtn);
  btns.appendChild(removeBtn);

  card.appendChild(dot);
  card.appendChild(info);
  card.appendChild(clicks);
  card.appendChild(btns);

  toggleBtn.addEventListener('click', () => msgContent({ type: 'ACB_TOGGLE_ACTIVE', id: t.id }));
  removeBtn.addEventListener('click', () => msgContent({ type: 'ACB_REMOVE_TARGET', id: t.id }));
  return card;
}

function makeKeyCard(t, i) {
  const card = document.createElement('div');
  card.className = 'tcard' + (t.active ? '' : ' inactive');
  card.dataset.id = t.id;

  const dot = document.createElement('div');
  dot.className = 'tcard-dot';
  dot.style.background = t.color;

  const info = document.createElement('div');
  info.className = 'tcard-info';
  const nameDiv = document.createElement('div');
  nameDiv.className = 'tcard-name';
  const badge = document.createElement('span');
  badge.className = 'key-badge';
  badge.title = 'Click to rebind';
  badge.textContent = t.key === 'Space' ? '␣ Space' : t.key;
  nameDiv.appendChild(badge);
  const meta = document.createElement('div');
  meta.className = 'tcard-meta';
  meta.textContent = 'Key target ' + (i + 1);
  info.appendChild(nameDiv);
  info.appendChild(meta);

  const clicks = document.createElement('span');
  clicks.className = 'tcard-clicks';
  clicks.textContent = fmt(t.clickCount);

  const btns = document.createElement('div');
  btns.className = 'tcard-btns';
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'icon-btn' + (t.active ? ' active' : '');
  toggleBtn.dataset.act = 'toggle';
  toggleBtn.textContent = t.active ? '⏸' : '▶';
  const removeBtn = document.createElement('button');
  removeBtn.className = 'icon-btn rm';
  removeBtn.dataset.act = 'remove';
  removeBtn.textContent = '✕';
  btns.appendChild(toggleBtn);
  btns.appendChild(removeBtn);

  card.appendChild(dot);
  card.appendChild(info);
  card.appendChild(clicks);
  card.appendChild(btns);

  badge.addEventListener('click', () => {
    if (badge.dataset.rec) return;
    badge.dataset.rec = '1';
    badge.classList.add('recording');
    badge.textContent = '…';
    const handler = e => {
      e.preventDefault();
      e.stopPropagation();
      const k = e.key === ' ' ? 'Space' : e.key;
      badge.textContent = k === 'Space' ? '␣ Space' : k;
      badge.classList.remove('recording');
      delete badge.dataset.rec;
      document.removeEventListener('keydown', handler, true);
      msgContent({ type: 'ACB_UPDATE_KEY_TARGET', id: t.id, key: k });
      const kt = keyTargets.find(x => x.id === t.id);
      if (kt) kt.key = k;
    };
    document.addEventListener('keydown', handler, true);
  });

  toggleBtn.addEventListener('click', () => msgContent({ type: 'ACB_TOGGLE_KEY_TARGET', id: t.id }));
  removeBtn.addEventListener('click', () => msgContent({ type: 'ACB_REMOVE_KEY_TARGET', id: t.id }));
  return card;
}

function renderStats() {
  dom.sTotalClicks.textContent = fmt(statsCache.totalClicks);
  dom.sCPS.textContent         = (statsCache.cps || 0).toFixed(1);
  dom.sTime.textContent        = fmtDur(statsCache.sessionMs);
  const list = S.actionMode === 'key' ? keyTargets : targets;
  dom.sTargets.textContent = list.filter(t => t.active).length;
}

function fmt(n)     { return Number(n || 0).toLocaleString(); }
function fmtDur(ms) {
  const s = Math.floor((ms || 0) / 1000);
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60].map(v => String(v).padStart(2,'0')).join(':');
}

function startPoll() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const res = await msgContent({ type: 'ACB_GET_STATE' });
    applyState(res);
  }, 200);
}

function wireEvents() {

  dom.masterBtn.addEventListener('click', async () => {
    if (S.actionMode === 'mouse') {
      await msgContent({ type: 'ACB_ADD_TARGET', settings: S });
      const res = await msgContent({ type: 'ACB_GET_STATE' });
      applyState(res);
    } else {
      if (anyRunning) {
        await msgContent({ type: 'ACB_STOP_ALL' });
      } else {
        await msgContent({ type: 'ACB_START_ALL', settings: S });
      }
      const res = await msgContent({ type: 'ACB_GET_STATE' });
      applyState(res);
    }
  });

  dom.startBtn.addEventListener('click', async () => {
    if (anyRunning) {
      await msgContent({ type: 'ACB_STOP_ALL' });
    } else {
      await msgContent({ type: 'ACB_START_ALL', settings: S });
    }
    const res = await msgContent({ type: 'ACB_GET_STATE' });
    applyState(res);
  });

  initSeg(dom.actionModeGroup, val => {
    S.actionMode = val;
    dom.mouseOptions.style.display = val === 'mouse' ? '' : 'none';
    dom.keyOptions.style.display   = val === 'key'   ? '' : 'none';
    updateAddBtnLabel();
    updateMasterBtnIcon();
    _renderedMode = null;
    if (val === 'key') _defaultKeyAdded = false;
    msgContent({ type: 'ACB_SET_MODE', mode: val });
    saveAndPush();
  });

  initSeg(dom.clickTypeGroup, val => { S.clickType = val; saveAndPush(); });

  let keyRecording = false;
  dom.keyInput.addEventListener('click', () => {
    keyRecording = true;
    dom.keyInput.value = '…';
    dom.keyInput.classList.add('recording');
  });
  dom.keyInput.addEventListener('keydown', e => {
    if (!keyRecording) return;
    e.preventDefault();
    S.keyToPress = e.key === ' ' ? 'Space' : e.key;
    dom.keyInput.value = S.keyToPress;
    dom.keyInput.classList.remove('recording');
    keyRecording = false;
    saveAndPush();
  });
  dom.keyInput.addEventListener('blur', () => {
    if (keyRecording) {
      keyRecording = false;
      dom.keyInput.value = S.keyToPress;
      dom.keyInput.classList.remove('recording');
    }
  });
  dom.clearKeyBtn.addEventListener('click', () => { S.keyToPress = 'Space'; dom.keyInput.value = 'Space'; saveAndPush(); });

  initSeg(dom.inputModeGroup, val => { S.inputMode = val; syncIntervalDisplay(); save(); });

  dom.intervalInput.addEventListener('change', () => {
    S.intervalMs = parseIntervalInput(dom.intervalInput.value);
    syncIntervalDisplay(); checkIntervalWarn(); syncIntervalStat(); saveAndPush();
  });
  dom.intervalInput.addEventListener('input', () => {
    S.intervalMs = parseIntervalInput(dom.intervalInput.value);
    checkIntervalWarn(); syncIntervalStat();
  });
  dom.intervalSlider.addEventListener('input', () => {
    const v = parseInt(dom.intervalSlider.value);
    if (S.inputMode === 'cps') {
      S.intervalMs = Math.max(1, 1000 / Math.max(0.1, v));
      dom.intervalInput.value = v;
    } else {
      S.intervalMs = Math.max(1, v);
      dom.intervalInput.value = v;
    }
    checkIntervalWarn(); syncIntervalStat(); saveAndPush();
  });
  dom.iDown.addEventListener('click', () => {
    if (S.inputMode === 'cps') {
      const cps = Math.max(0.1, (1000 / S.intervalMs) - 1);
      S.intervalMs = 1000 / cps;
    } else {
      S.intervalMs = Math.max(1, S.intervalMs - 10);
    }
    syncIntervalDisplay(); checkIntervalWarn(); syncIntervalStat(); saveAndPush();
  });
  dom.iUp.addEventListener('click', () => {
    if (S.inputMode === 'cps') {
      const cps = (1000 / S.intervalMs) + 1;
      S.intervalMs = 1000 / cps;
    } else {
      S.intervalMs = S.intervalMs + 10;
    }
    syncIntervalDisplay(); checkIntervalWarn(); syncIntervalStat(); saveAndPush();
  });

  dom.jitterSlider.addEventListener('input', () => {
    S.jitter = parseInt(dom.jitterSlider.value);
    dom.jitterVal.textContent = S.jitter + '%';
    saveAndPush();
  });

  dom.holdSlider.addEventListener('input', () => {
    S.holdMs = parseInt(dom.holdSlider.value);
    dom.holdVal.textContent = S.holdMs > 0 ? S.holdMs + ' ms' : 'off';
    saveAndPush();
  });

  dom.rptInf.addEventListener('click', () => {
    S.repeat = -1; dom.rptInf.classList.add('active'); dom.rptFixed.classList.remove('active');
    dom.rptCount.disabled = true; saveAndPush();
  });
  dom.rptFixed.addEventListener('click', () => {
    S.repeat = parseInt(dom.rptCount.value) || 100;
    dom.rptFixed.classList.add('active'); dom.rptInf.classList.remove('active');
    dom.rptCount.disabled = false; saveAndPush();
  });
  dom.rptCount.addEventListener('change', () => {
    if (!dom.rptCount.disabled) { S.repeat = Math.max(1, parseInt(dom.rptCount.value) || 1); saveAndPush(); }
  });

  dom.burstSlider.addEventListener('input', () => {
    S.burst = parseInt(dom.burstSlider.value);
    dom.burstVal.textContent = S.burst;
    saveAndPush();
  });

  let hotkeyRecording = false;
  dom.hotkeyInput.addEventListener('click', () => {
    hotkeyRecording = true;
    dom.hotkeyInput.value = '…';
    dom.hotkeyInput.classList.add('recording');
  });
  dom.hotkeyInput.addEventListener('keydown', e => {
    if (!hotkeyRecording) return;
    e.preventDefault();
    const parts = [];
    if (e.ctrlKey  && e.key !== 'Control') parts.push('Ctrl');
    if (e.shiftKey && e.key !== 'Shift')   parts.push('Shift');
    if (e.altKey   && e.key !== 'Alt')     parts.push('Alt');
    if (!['Control','Shift','Alt'].includes(e.key)) parts.push(e.key);
    if (parts.length) {
      S.hotkey = parts.join('+');
      dom.hotkeyInput.value = S.hotkey;
      dom.hotkeyInput.classList.remove('recording');
      hotkeyRecording = false;
      saveAndPush();
    }
  });
  dom.hotkeyInput.addEventListener('blur', () => {
    if (hotkeyRecording) {
      hotkeyRecording = false;
      dom.hotkeyInput.value = S.hotkey;
      dom.hotkeyInput.classList.remove('recording');
    }
  });
  dom.clearHotkeyBtn.addEventListener('click', () => { S.hotkey = ''; dom.hotkeyInput.value = ''; saveAndPush(); });

  dom.humanizeChk.addEventListener('change',     () => { S.humanize     = dom.humanizeChk.checked;     saveAndPush(); });
  dom.ignoreHiddenChk.addEventListener('change', () => { S.ignoreHidden = dom.ignoreHiddenChk.checked; saveAndPush(); });
  dom.soundFxChk.addEventListener('change',      () => { S.soundFx      = dom.soundFxChk.checked;      saveAndPush(); });

  dom.resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all settings to defaults?')) return;
    S = { ...DEFAULTS }; applyUI(); saveAndPush();
  });

  dom.addTargetBtn.addEventListener('click', () => {
    if (S.actionMode === 'key') {
      msgContent({ type: 'ACB_ADD_KEY_TARGET', key: S.keyToPress || 'Space' });
    } else {
      msgContent({ type: 'ACB_ADD_TARGET', settings: S });
    }
  });

  dom.clearAllBtn.addEventListener('click', () => {
    if (S.actionMode === 'key') {
      msgContent({ type: 'ACB_REMOVE_ALL_KEY' });
    } else {
      msgContent({ type: 'ACB_REMOVE_ALL' });
    }
  });

  dom.resetStatsBtn.addEventListener('click', () => {
    statsCache = { totalClicks: 0, sessionMs: 0, cps: 0 };
    msgContent({ type: 'ACB_RESET_STATS' });
    renderStats();
  });
}

browser.runtime.onMessage.addListener(msg => {
  if (msg.type === 'ACB_STATE') applyState(msg);
});

async function init() {
  const stored = await browser.storage.local.get(['settings', 'lastTab']);
  if (stored.settings) S = { ...DEFAULTS, ...stored.settings };
  wireEvents();
  applyUI();

  if (stored.lastTab) {
    const tabBtn = document.querySelector(`.tab[data-tab="${stored.lastTab}"]`);
    if (tabBtn) tabBtn.click();
  }

  const res = await msgContent({ type: 'ACB_GET_STATE' });
  applyState(res);
  startPoll();
}

document.addEventListener('DOMContentLoaded', init);
