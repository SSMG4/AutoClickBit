'use strict';

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

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    await chrome.storage.local.set({ settings: DEFAULTS, targets: [] });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_DEFAULTS') sendResponse(DEFAULTS);
  return false;
});
