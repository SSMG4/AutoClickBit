<div align="center">
<img src="/icons/icon128.png" alt="ACB" width="100" height="100"/>
</div>
<h1 align="center">AutoClickBit</h1>
<div align="center">

[![Stars](https://img.shields.io/github/stars/SSMG4/AutoClickBit?style=social)](https://github.com/SSMG4/AutoClickBit/stargazers)
[![GitHub Release](https://img.shields.io/github/v/release/SSMG4/AutoClickBit)](https://github.com/SSMG4/AutoClickBit/releases/latest)
[![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/SSMG4/AutoClickBit/total)](https://github.com/SSMG4/AutoClickBit/releases)
[![GitHub Downloads (latest)](https://img.shields.io/github/downloads/SSMG4/AutoClickBit/latest)](https://github.com/SSMG4/AutoClickBit/releases/latest)
[![Issues & Submissions](https://img.shields.io/github/issues/SSMG4/AutoClickBit)](https://github.com/SSMG4/AutoClickBit/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/SSMG4/AutoClickBit)](https://github.com/SSMG4/AutoClickBit/pulls)

Advanced multi-target autoclicker browser extension.
Free, open-source, no ads, no tracking.

</div>

---

## Overview

AutoClickBit is a browser extension that lets you place one or more click targets on any web page and fire automated mouse clicks or keyboard keypresses at precise intervals. Targets appear as draggable ghost cursors on desktop, or draggable dots on mobile. Everything runs locally inside your browser, no data is collected or transmitted.

---

## Features

**Mouse autoclicking**

- Unlimited independent targets, each with its own start/stop control
- Click types: left, right, middle, double
- Interval control in milliseconds or clicks per second (CPS)
- Hold duration: configurable delay between `mousedown` and `mouseup`
- Per-target ripple feedback rendered in each cursor's own color

**Keyboard autoclicking**

- Multiple independent key targets, each bound to a different key
- Keys are rebound per-target directly from the Targets tab
- On-screen key badge appears on each keypress and fades upward
- A default Space target is created automatically when switching to keyboard mode

**Shared controls**

- Interval jitter: randomize each interval by 0–100% of its base value
- Humanize mode: Gaussian distribution for more natural, less mechanical timing
- Burst: fire 1–20 actions per interval tick
- Repeat: infinite loop or stop after a fixed count
- Global hotkey: bind any key or combination to toggle all active targets
- Click sound: noise-burst audio feedback via Web Audio API, no audio files required
- Ignore invisible elements: skip clicks on hidden or zero-size DOM nodes
- Live stats: total clicks, live CPS, session timer, active target count
- Settings and last-used tab persist across popup closes and browser restarts

**Platform behavior**

- Desktop: ghost cursor overlays draggable with the mouse
- Mobile without keyboard: draggable dot overlays, long-press for controls
- Mobile with keyboard or mouse connected: automatically switches to cursor mode

---

## Browser Compatibility

| Browser | Status | Notes |
|---|---|---|
| Chrome 109+ | Soon | Manifest V3 |
| Firefox 140+ (Desktop) | [Available](https://addons.mozilla.org/en-US/firefox/addon/autoclickbit/) | Manifest V3 |
| Firefox 142+ (Android) | [Available](https://addons.mozilla.org/en-US/firefox/addon/autoclickbit/) | Dots instead of cursors |
| Edge 109+ | Full | Chromium-based |
| Brave | Full | Chromium-based |
| Opera | Full | Chromium-based |
| Vivaldi | Full | Chromium-based |
| Samsung Internet | Untested | Chromium-based |
| Safari | Not supported | Lacks MV3 content script injection |

---

## Installation

### Extension stores

Status available in [Browser Compatibility](#browser-compatibility). Check the [releases page](https://github.com/AutoClickBit/AutoClickBit/releases) as an alternative.

### Manual installation from source

Clone the repository or download and extract the latest release ZIP:

```bash
git clone https://github.com/SSMG4/AutoClickBit.git
```

---

**Chrome, Edge, Brave, Opera, Vivaldi, and other Chromium-based browsers**

1. Navigate to your browser's extensions page:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
   - Opera: `opera://extensions`
   - Vivaldi: `vivaldi://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `AutoClickBit` folder (the one that contains `manifest.json`).
5. The icon will appear in your toolbar. Pin it if needed.

The extension persists across browser restarts when loaded this way.

---

**Firefox Desktop**

Firefox does not permanently accept unpacked extensions outside of development environments. There are three options:

*Option 1: Temporary load via about:debugging (removed on browser close):*

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `manifest.json` inside the `AutoClickBit` folder.
4. The extension is active until Firefox is closed.

*Option 2: Permanent install on a development profile:*

1. Go to `about:profiles` and create a new dedicated profile.
2. Open that profile, then go to `about:config` and set `xpinstall.signatures.required` to `false`.
3. Package the extension as a ZIP: `cd AutoClickBit && zip -r autoclickbit.zip . -x "*.git*" -x "*.DS_Store"`.
4. Go to `about:addons`, click the gear icon, and choose **Install Add-on From File**, then select the ZIP.

*Option 3: web-ext (recommended for development):*

```bash
npm install --global web-ext
cd AutoClickBit
web-ext run
```

This launches a temporary Firefox instance with the extension loaded and live-reloads on file changes.

---

**Firefox for Android**

Firefox on Android only allows extensions listed in Mozilla's approved add-on collection by default. To sideload during development:

1. Install [Firefox Nightly for Android](https://play.google.com/store/apps/details?id=org.mozilla.fenix).
2. Open Nightly, go to Settings > About Firefox Nightly, and tap the logo five times to unlock developer options.
3. Go to Settings > Custom Add-on collection and point it to a Mozilla collection containing the extension.

Alternatively, push directly from a computer using `web-ext` and ADB:

```bash
# Find your device ID
adb devices

# Run the extension on the connected device
web-ext run --target=firefox-android --android-device=<device-id>
```

USB debugging must be enabled on the device.

---

**Samsung Internet**

Samsung Internet is Chromium-based but does not support unpacked extension loading. Extensions must be distributed through the Galaxy Store. This browser is currently untested with AutoClickBit.

---

## Usage

### Mouse autoclicking

1. Click the AutoClickBit icon in your toolbar to open the popup.
2. On the **Click** tab, confirm **Mouse** is selected as the action mode.
3. Set your desired click type, interval, jitter, repeat count, and hold duration.
4. Click the crosshair button in the header to place a cursor on the page. Drag it to your target position. Repeat for additional targets.
5. Press the green play button in the header, or use your configured hotkey, to start all targets. Individual targets can also be started and stopped from the **Targets** tab.
6. Press the play button or hotkey again to stop.

On mobile, targets appear as colored dots. Long-press a dot to reveal its toggle and remove controls.

### Keyboard autoclicking

1. On the **Click** tab, select **Keyboard** as the action mode.
2. A Space key target is created automatically in the **Targets** tab.
3. To change the key for an existing target, click its key badge in the Targets tab and press the desired key.
4. To add a second key target with a different key, bind the new key on the Click tab, then click **Add Key** on the Targets tab.
5. Start and stop using the play button in the header or your hotkey.

### Hotkey

Open the **Advanced** tab, click the hotkey field, and press any key or combination. The default is `F8`. The hotkey toggles all currently active targets globally. If any are running it stops them all, if none are running it starts them all.

---

## Settings reference

### Click tab

| Setting | Description |
|---|---|
| Action | Switch between Mouse and Keyboard autoclicking |
| Click type | Left, Right, Middle, or Double (mouse mode only) |
| Key to press | Key used when adding new key targets in keyboard mode |
| Interval | Time between actions in milliseconds, or as clicks per second |
| Jitter | Randomize each interval by plus or minus N percent |
| Repeat | Infinite loop or stop after a fixed number of actions |
| Hold duration | Delay in ms between mousedown and mouseup (mouse mode only) |

### Advanced tab

| Setting | Description |
|---|---|
| Burst | Actions fired per interval tick (1–20) |
| Global hotkey | Key or combination that toggles all targets |
| Humanize jitter | Gaussian distribution instead of uniform random |
| Ignore invisible | Skip clicks on hidden or zero-size elements |
| Click sound | Short noise-burst sound on each action via Web Audio API |

---

## Known limitations

- **Canvas-based applications**: AutoClickBit dispatches standard DOM `MouseEvent` objects. Applications that render to a `<canvas>` and read raw pointer input directly may not respond to synthesized events.
- **Pages with strict Content Security Policy**: some sites restrict script injection or event handling through CSP headers. AutoClickBit cannot override these restrictions.
- **Cross-origin iframes**: the content script only runs in the top-level frame. Elements inside cross-origin iframes cannot be targeted.
- **Firefox temporary installs**: extensions loaded via `about:debugging` are removed when Firefox closes, and `browser.storage.local` data is cleared with them. Use a signed install or a development profile for settings to persist.

---

## Reporting issues

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full process.

The short version: open an issue on the [GitHub issue tracker](https://github.com/SSMG4/AutoClickBit/issues). If the extension is available on an extension store that provides its own reporting channel, that may also be used.

---

## License

AutoClickBit is free software released under the GNU General Public License v3.0. You are free to use, study, modify, and distribute it under the terms of that license. See [LICENSE](LICENSE) for the full text.
