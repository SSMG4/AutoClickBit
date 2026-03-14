# Contributing to AutoClickBit

Thank you for taking the time to contribute. This document covers everything you need to know: reporting bugs, requesting features, submitting code, and general project conventions.

---

## Table of contents

* [Reporting bugs](#reporting-bugs)
* [Requesting features](#requesting-features)
* [Where not to report](#where-not-to-report)
* [Submitting code](#submitting-code)
* [Code style](#code-style)
* [Project structure](#project-structure)
* [Testing across browsers](#testing-across-browsers)
* [Commit messages](#commit-messages)
* [License](#license)

---

## Reporting bugs

Bugs should be reported on the [GitHub issue tracker](https://github.com/SSMG4/AutoClickBit/issues). If the extension is available on an extension store that provides its own report mechanism (such as the Chrome Web Store or Mozilla Add-ons), that channel may also be used for store-specific issues such as policy violations or store listing problems.

Before opening a new issue, search the tracker to check whether it has already been reported. If an open issue already exists for your problem, add a comment with any additional details rather than opening a duplicate.

A useful bug report includes:

* The browser name, version, and operating system
* The extension version (visible in your browser's extensions page)
* A clear description of what you expected to happen and what actually happened
* The steps to reproduce the issue reliably
* Any error messages from the browser console (`F12` > Console tab)
* A screenshot or screen recording if the issue is visual

If you cannot reproduce the issue reliably, say so. An intermittent report with honest context is more useful than a confident report that omits uncertainty.

---

## Requesting features

Feature requests are welcome on the [issue tracker](https://github.com/SSMG4/AutoClickBit/issues). Use a descriptive title and explain what the feature would do, why it would be useful, and how you imagine it working. If you are willing to implement it yourself, mention that too.

---

## Where not to report

Do not report issues by email, social media, or any channel other than those listed above. Messages sent through other channels will not be monitored and may go unanswered.

---

## Submitting code

1. Fork the repository and create a branch from `master`. Use a short, descriptive branch name such as `fix-cps-slider` or `add-repeat-per-target`.
2. Make your changes, keep commits focused. One logical change per commit is preferred over a single large commit that mixes unrelated changes.
3. Test your changes in at least one Chromium-based browser and Firefox Desktop before submitting. See [Testing across browsers](#testing-across-browsers) for guidance.
4. Open a pull request against the `master` branch. Write a clear description of what the PR changes and why. Link any related issues using `Fixes #123` or `Closes #123` in the description so they close automatically on merge.
5. Be responsive to review feedback. If a reviewer requests changes, address them or explain your reasoning for not doing so.

For significant changes like new features, changes to the extension's permissions, or changes to the manifest, please open an issue first to discuss the approach before writing the code. This avoids situations where a large amount of work is submitted that turns out to conflict with the project's direction.

---

## Code style

AutoClickBit uses plain JavaScript with no build step and no dependencies. Keep it that way. The goal is that anyone can open the source files and read them without needing to understand a framework or run a compiler.

**General conventions:**

* `'use strict'` at the top of every JS file
* Two-space indentation
* Single quotes for strings
* Semicolons required
* No comments in committed code (the code should be self-explanatory; complex logic should be broken into named functions)
* No TypeScript, no JSX, no transpilation
* No third-party libraries

**Content script (`content.js`):**

* Everything is wrapped in an IIFE to avoid polluting the page's global scope
* DOM manipulation happens through the functions already established in the file (`injectStyles`, `buildCursorEl`, etc.)
* New overlay elements must use the `acb-` CSS class prefix

**Popup (`popup.js`):**

* All DOM references are declared once in the `dom` object at the top of the file
* State is stored in module-level variables (`S`, `targets`, `keyTargets`, `statsCache`, `anyRunning`)
* Communication with the content script goes through `msgContent()`
* `applyState()` is the single point where content script state is applied to the popup UI

**CSS (`popup.css`):**

* CSS custom properties (variables) for all colors and repeated values
* No external fonts or resources
* Class names follow a short, consistent pattern (`.tcard`, `.seg`, `.icon-btn`, etc.)

---

## Project structure

```
AutoClickBit/
├── manifest.json      Extension manifest (Manifest V3)
├── background.js      Service worker: writes defaults on install
├── content.js         Click engine: overlays, event dispatch, audio
├── popup.html         Popup markup
├── popup.css          Popup styles
├── popup.js           Popup logic: settings, state sync, rendering
├── icons/
│   ├── icon.svg       Source icon (edit this, regenerate PNGs from it)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── CONTRIBUTING.md    This file
├── LICENSE            GNU General Public License v3.0
└── README.md          User-facing documentation
```

To regenerate icon PNGs from `icon.svg`, you can use `cairosvg`:

```bash
pip install cairosvg
python3 -c "
import cairosvg
for size in \[16, 32, 48, 128]:
    cairosvg.svg2png(url='icons/icon.svg', write\_to=f'icons/icon{size}.png', output\_width=size, output\_height=size)
"
```

---

## Testing across browsers

Before submitting, verify your changes in as many of the following as you have access to:

|Browser|How to load|
|-|-|
|Chrome|`chrome://extensions` > Developer mode > Load unpacked|
|Firefox Desktop|`about:debugging` > Load Temporary Add-on > select `manifest.json`|
|Edge|`edge://extensions` > Developer mode > Load unpacked|
|Brave|`brave://extensions` > Developer mode > Load unpacked|
|Firefox Android|Firefox Nightly + custom add-on collection, or `web-ext run --target=firefox-android`|

At a minimum, test in Chrome and Firefox Desktop. If your change touches mobile-specific code paths (dot overlays, touch dragging, long-press menus), test in Firefox Android or a browser DevTools mobile simulation.

Useful things to verify:

* Adding and removing targets works as expected
* Starting and stopping via the header button and hotkey works
* Settings changes take effect immediately on active targets
* The popup opens and closes without errors in the browser console
* Settings persist after closing and reopening the popup

---

## Commit messages

Use the imperative mood in the subject line: "Fix CPS slider jitter", not "Fixed" or "Fixes". Keep the subject under 72 characters. If more context is needed, add it in the body after a blank line.

Good examples:

```
Fix double cursor on first Add Target click
Add default Space key target in keyboard mode
Update README with Firefox Android sideloading steps
```

---

## License

By submitting a pull request, you agree that your contribution will be licensed under the GNU General Public License v3.0, the same license that covers the rest of the project. See [LICENSE](LICENSE) for the full terms.

