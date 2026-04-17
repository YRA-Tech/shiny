# Shiny

A Chrome extension that enhances SVG visibility and accessibility for users with low vision and color blindness. Built as a demo for various accessibility features.  In most cases, regular focus styling and image selection techniques may be sufficient. Users who have vision impairments can also use magnification and screen readers to good effect in most cases. However, in some domains the nature of the task, particularly some involving visual information, drawing, protographs, and images, even the existing tools may not be optimal. This extension is intended to offer gap-filling tools for those special subject matter domains. 

## Features

### SVG enhancements

- **Outlines** — Adds configurable colored outlines to SVG shapes (`path`, `rect`, `circle`, `ellipse`, `polygon`, `polyline`, `line`, `text`)
- **Contrast** — CSS-filter-based contrast and saturation boost at three levels (medium / high / maximum)
- **Interactive element highlighting** — Detects clickable SVG elements and applies a configurable color halo on hover/focus
- **Focus indicators** — Visible focus rings on focusable SVG elements; auto-adds `tabindex="0"` where needed
- **Image HDR** — Brightness/contrast/saturation boost for `<img>` and `<video>` at three intensity levels

### Detection

- Inline `<svg>`, `<img src="*.svg">`, `<object>`, `<embed>`
- Lottie animations (class-based, custom-element, data-attribute detection)
- Deep shadow DOM traversal (per-root `MutationObserver`s)
- Dynamic content (`MutationObserver` on the document body)

### Per-page configuration

Three JSON files in `data/` drive page-specific behavior. Each uses per-URL matching: exact match first, then longest prefix match.

| File | Purpose |
| ---- | ------- |
| `data/instructions.json` | Text passage shown at the top of the panel on a given page |
| `data/anchors.json` | XPath of an element the floating icon should overlay |
| `data/jumplinks.json` | List of jump links rendered in the panel for a given page |

## UI

### Floating accessibility button

Every page gets a floating button — a universal accessibility icon (vitruvian-figure style) on a blue circular background — that the extension injects via shadow DOM for style isolation. By default it sits vertically centered on the right edge of the viewport; if a matching entry in `data/anchors.json` resolves to an element on the page, the button overlays that element's center and follows it on scroll/resize. The button only appears in the top frame (not inside iframes).

### Settings panel

Clicking the floating button opens an in-page settings panel (also inside the shadow DOM). The panel closes on `Escape`, when clicking outside it, or when clicking the floating button again. Sections, in order:

1. **Instructions** — page-specific text (hidden if no match in `instructions.json`)
2. **Jump To** — page-specific jump links (hidden if no match in `jumplinks.json`)
3. **Enable Enhancements** — master toggle
4. **Outlines** — scope (None / All SVGs / Selectors), color, width (1–5px)
5. **Contrast** — scope, level
6. **Highlighting** — scope, color, focus indicators toggle
7. **Image HDR** — scope (applied to `<img>`/`<video>`), intensity
8. **Reset to Defaults**

Each enhancement has a **scope** control with three options:

- **None** — enhancement is off
- **All SVGs** — applied to every detected element (for Image HDR: every `<img>`/`<video>`)
- **Selectors** — applied only to elements matching one of a user-supplied CSS selector list (JSON array of strings, e.g. `["svg.chart", "#logo svg"]`). The selector is tested with `Element.matches()`, so it must describe the SVG/image element itself (use descendant selectors like `.diagram svg` if you want to target by container).

Selector JSON is validated live as you type. A red border indicates invalid JSON or a non-string-array value; the panel will not save while any selectors textarea is invalid (so you can't accidentally clobber your previous list).

### Toolbar icon

Clicking the browser toolbar icon toggles the visibility of the floating button on the current tab (it does **not** open a popup). State is stored in `chrome.storage.sync` under `floatingButtonVisible` and shared across tabs; a click in one tab flips the state globally, but only the active tab receives the immediate toggle message — other open tabs pick up the new state on next load.

## Configuration

### `data/instructions.json`

```json
[
  {
    "url": "https://example.com",
    "text": "Welcome to the demo. Try enabling outlines to see..."
  }
]
```

### `data/anchors.json`

```json
[
  {
    "url": "https://developer.mozilla.org/en-US/docs/Web/SVG",
    "xpath": "//main//h1"
  }
]
```

The FAB is centered over the first element matched by `xpath` and tracks it via `ResizeObserver` plus scroll/resize listeners.

### `data/jumplinks.json`

```json
[
  {
    "url": "https://developer.mozilla.org/en-US/docs/Web/SVG",
    "links": [
      {
        "text": "Jump to tutorials",
        "lang": "en",
        "xpath": "//h2[contains(., 'Tutorials')]",
        "id": "shiny-jump-tutorials"
      },
      {
        "text": "MDN home",
        "lang": "en",
        "href": "https://developer.mozilla.org/"
      }
    ]
  }
]
```

Each link is either:

- **On-page** — `xpath` resolves the target, `id` is assigned to it, `<a href="#id">` is rendered; click triggers smooth scroll + focus
- **Off-page** — `href` is used directly; cross-origin URLs open in a new tab with `rel="noopener noreferrer"`

`lang` is stored on the `<a lang="...">` attribute for future localization.

## Project structure

```text
shiny/
├── manifest.json              # MV3 manifest
├── background/
│   └── service-worker.js      # Install defaults, toolbar-icon toggle
├── content/
│   ├── content.js             # Main orchestrator — detect → enhance
│   ├── svg-detector.js        # SVG + Lottie + shadow-DOM detection
│   ├── svg-enhancer.js        # Outlines, contrast, highlight, focus
│   └── floating-panel.js      # Floating FAB + in-page settings panel
├── lib/
│   └── utils.js               # ShinyStorage (sync w/ local fallback)
├── popup/                     # Legacy popup (unused — FAB now drives the UI)
├── styles/
│   └── injected.css           # Classes used by enhancer + HDR
├── data/
│   ├── instructions.json      # Per-URL instructions
│   ├── anchors.json           # Per-URL FAB anchor XPath
│   └── jumplinks.json         # Per-URL jump links
└── icons/                     # 16/48/128px icons
```

## Settings storage

All settings live in `chrome.storage.sync` (falls back to `chrome.storage.local` on quota failure). Content scripts react to changes via `chrome.storage.onChanged`, so settings written from the in-page panel propagate automatically.

Defaults:

| Key | Default |
| --- | ------- |
| `enabled` | `true` |
| `outlineScope` / `outlineSelectors` | `'all'` / `[]` |
| `outlineColor` / `outlineWidth` | `'#000000'` / `2` |
| `contrastScope` / `contrastSelectors` / `contrastLevel` | `'all'` / `[]` / `'high'` |
| `highlightScope` / `highlightSelectors` / `highlightColor` | `'all'` / `[]` / `'#FFFF00'` |
| `focusIndicators` | `true` |
| `imageHdrScope` / `imageHdrSelectors` / `imageHdrIntensity` | `'none'` / `[]` / `'medium'` |
| `floatingButtonVisible` | `true` |

Each `*Scope` key is one of `'none'`, `'all'`, or `'selectors'`. When the scope is `'selectors'`, the corresponding `*Selectors` array is a list of CSS selectors tested against each candidate element with `Element.matches()`.

## Install (development)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this directory

Reload the extension from `chrome://extensions` after editing any file.

## Permissions

- `storage` — settings persistence
- `activeTab` — messaging the current tab on toolbar click
- `<all_urls>` (host + content script) — run on every page
- `web_accessible_resources` — `data/*.json` so content scripts can `fetch()` them

## Troubleshooting

**Clicking the toolbar icon seems to do nothing.** Remember: it toggles the floating button's visibility, not a popup. Look for the blue accessibility icon on the right edge of the page. If it was visible, the click hid it; if hidden, the click showed it. The settings panel is opened by clicking the *floating button*, not the toolbar icon.

**The floating button isn't appearing.**

- You may be on a page where Chrome blocks content scripts: `chrome://…`, `chrome-extension://…`, the new-tab page, or `chrome.google.com/webstore`. Try a regular website.
- After editing extension code, reload the extension at `chrome://extensions` **and** refresh open tabs so the new content script is injected.
- The button only renders in the top frame, so it won't appear inside iframes.

**Settings aren't being saved.** If a selectors textarea is showing a red border, its JSON is invalid and the whole panel refuses to save until it's fixed. Clear the textarea (empty = `[]`) or enter a valid JSON string array.

**The panel shows no "Instructions" / "Jump To" section.** Those sections are hidden unless the current URL matches an entry in `data/instructions.json` / `data/jumplinks.json`. Matching is exact-URL-first, then longest prefix.
