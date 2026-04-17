/**
 * Shiny - Floating accessibility button and inline settings panel
 * Injected into every page. Uses shadow DOM for style isolation.
 */

(function () {
  'use strict';

  // Prevent double-init (e.g. in iframes that also get content scripts)
  if (window.__shinyFloatingPanel) return;
  window.__shinyFloatingPanel = true;

  // Only run in the top frame
  if (window !== window.top) return;

  // ── Accessibility icon SVG (universal accessibility / vitruvian figure) ──
  const ACCESSIBILITY_ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" width="28" height="28">
      <!-- head -->
      <circle cx="50" cy="16" r="8"/>
      <!-- arms stretched out -->
      <path d="M50 30 L50 32 Q50 34 48 35 L28 42 Q24 43.5 23 40 Q22 36.5 26 35 L44 30 H56 L74 35 Q78 36.5 77 40 Q76 43.5 72 42 L52 35 Q50 34 50 32 Z"/>
      <!-- torso -->
      <rect x="46" y="32" width="8" height="26" rx="3"/>
      <!-- left leg -->
      <path d="M46 56 L32 84 Q30 88 34 90 Q38 92 40 88 L50 66"/>
      <!-- right leg -->
      <path d="M54 56 L68 84 Q70 88 66 90 Q62 92 60 88 L50 66"/>
    </svg>`;

  // All panel HTML is static/hardcoded — no user input flows into innerHTML.
  // This is safe from XSS because no dynamic content is interpolated.
  const PANEL_HTML = `
    <div class="panel-header">
      <h1>Shiny</h1>
      <p>SVG Accessibility Enhancer</p>
    </div>

    <section class="instructions-section" id="sp-instructions-section" aria-labelledby="sp-instructions-heading" style="display:none;">
      <h2 id="sp-instructions-heading">Instructions</h2>
      <p id="sp-instructions-text"></p>
      <hr>
    </section>

    <section class="jumplinks-section" id="sp-jumplinks-section" aria-labelledby="sp-jumplinks-heading" style="display:none;">
      <h2 id="sp-jumplinks-heading">Jump To</h2>
      <ul id="sp-jumplinks-list"></ul>
      <hr>
    </section>

    <div class="panel-body">
      <div class="toggle-section" aria-labelledby="sp-global-toggle-label">
        <label class="toggle-switch">
          <input type="checkbox" id="sp-enabled" aria-describedby="sp-enabled-desc">
          <span class="slider"></span>
        </label>
        <span id="sp-global-toggle-label" class="toggle-label">Enable Enhancements</span>
        <span id="sp-enabled-desc" class="sr-only">Toggle all SVG accessibility enhancements on or off</span>
      </div>

      <hr>

      <div class="settings-section" aria-labelledby="sp-outline-heading">
        <h2 id="sp-outline-heading">Outlines</h2>
        <div class="setting-row">
          <label for="sp-outlineScope">Apply to:</label>
          <select id="sp-outlineScope" data-scope-for="outline">
            <option value="none">None</option>
            <option value="all">All SVGs</option>
            <option value="selectors">Selectors…</option>
          </select>
        </div>
        <div class="setting-row selectors-row" data-selectors-for="outline" style="display:none;">
          <textarea id="sp-outlineSelectors" rows="2" placeholder='["svg.chart", "#logo svg"]' aria-label="Outline target selectors as JSON array"></textarea>
        </div>
        <div class="setting-row">
          <label for="sp-outlineColor">Color:</label>
          <input type="color" id="sp-outlineColor" value="#000000">
        </div>
        <div class="setting-row">
          <label for="sp-outlineWidth">Width:</label>
          <input type="range" id="sp-outlineWidth" min="1" max="5" value="2">
          <output id="sp-outlineWidthValue" for="sp-outlineWidth">2px</output>
        </div>
      </div>

      <div class="settings-section" aria-labelledby="sp-contrast-heading">
        <h2 id="sp-contrast-heading">Contrast</h2>
        <div class="setting-row">
          <label for="sp-contrastScope">Apply to:</label>
          <select id="sp-contrastScope" data-scope-for="contrast">
            <option value="none">None</option>
            <option value="all">All SVGs</option>
            <option value="selectors">Selectors…</option>
          </select>
        </div>
        <div class="setting-row selectors-row" data-selectors-for="contrast" style="display:none;">
          <textarea id="sp-contrastSelectors" rows="2" placeholder='["svg.chart"]' aria-label="Contrast target selectors as JSON array"></textarea>
        </div>
        <div class="setting-row">
          <label for="sp-contrastLevel">Level:</label>
          <select id="sp-contrastLevel">
            <option value="medium">Medium</option>
            <option value="high" selected>High</option>
            <option value="maximum">Maximum</option>
          </select>
        </div>
      </div>

      <div class="settings-section" aria-labelledby="sp-highlight-heading">
        <h2 id="sp-highlight-heading">Highlighting</h2>
        <div class="setting-row">
          <label for="sp-highlightScope">Apply to:</label>
          <select id="sp-highlightScope" data-scope-for="highlight">
            <option value="none">None</option>
            <option value="all">All SVGs</option>
            <option value="selectors">Selectors…</option>
          </select>
        </div>
        <div class="setting-row selectors-row" data-selectors-for="highlight" style="display:none;">
          <textarea id="sp-highlightSelectors" rows="2" placeholder='["svg.interactive"]' aria-label="Highlight target selectors as JSON array"></textarea>
        </div>
        <div class="setting-row">
          <label for="sp-highlightColor">Color:</label>
          <input type="color" id="sp-highlightColor" value="#FFFF00">
        </div>
        <div class="setting-row">
          <label class="checkbox-label">
            <input type="checkbox" id="sp-focusIndicators">
            <span>Show focus indicators</span>
          </label>
        </div>
      </div>

      <div class="settings-section" aria-labelledby="sp-image-hdr-heading">
        <h2 id="sp-image-hdr-heading">Image HDR</h2>
        <div class="setting-row">
          <label for="sp-imageHdrScope">Apply to:</label>
          <select id="sp-imageHdrScope" data-scope-for="imageHdr">
            <option value="none">None</option>
            <option value="all">All images &amp; videos</option>
            <option value="selectors">Selectors…</option>
          </select>
        </div>
        <div class="setting-row selectors-row" data-selectors-for="imageHdr" style="display:none;">
          <textarea id="sp-imageHdrSelectors" rows="2" placeholder='["img.hero", "video"]' aria-label="Image HDR target selectors as JSON array"></textarea>
        </div>
        <div class="setting-row">
          <label for="sp-imageHdrIntensity">Intensity:</label>
          <select id="sp-imageHdrIntensity">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <footer>
        <button class="reset-btn" id="sp-resetBtn" type="button">Reset to Defaults</button>
        <p class="version">Version 1.0.0</p>
      </footer>
    </div>
  `;

  // ── Build the host element + shadow root ──
  const host = document.createElement('div');
  host.id = 'shiny-floating-host';
  const shadow = host.attachShadow({ mode: 'open' });

  // ── Styles (all scoped inside shadow DOM) ──
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      all: initial;
      position: fixed;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }

    /* ── Floating trigger button ── */
    .shiny-fab {
      position: fixed;
      right: 18px;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: #2563eb;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);
      transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
      z-index: 2147483647;
    }
    .shiny-fab:hover {
      background: #1d4ed8;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .shiny-fab:focus-visible {
      outline: 3px solid #93c5fd;
      outline-offset: 2px;
    }
    .shiny-fab.hidden { display: none; }
    /* Anchored mode: top/left are set inline via JS; disable right/transform */
    .shiny-fab.anchored {
      right: auto;
      top: 0;
      left: 0;
      transform: none;
    }

    /* ── Panel ── */
    .shiny-panel {
      position: fixed;
      right: 78px;
      top: 50%;
      transform: translateY(-50%);
      width: 310px;
      max-height: 80vh;
      overflow-y: auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.18);
      padding: 16px;
      display: none;
      z-index: 2147483646;
    }
    .shiny-panel.open { display: block; }

    /* scrollbar */
    .shiny-panel::-webkit-scrollbar { width: 6px; }
    .shiny-panel::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

    /* ── Panel header ── */
    .panel-header {
      text-align: center;
      margin-bottom: 14px;
    }
    .panel-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 2px;
    }
    .panel-header p {
      font-size: 12px;
      color: #666;
    }

    /* ── Instructions section ── */
    .instructions-section {
      margin-bottom: 14px;
    }
    .instructions-section h2 {
      font-size: 14px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 6px;
    }
    .instructions-section p {
      font-size: 13px;
      color: #444;
      line-height: 1.55;
    }

    /* ── Jump links section ── */
    .jumplinks-section {
      margin-bottom: 14px;
    }
    .jumplinks-section h2 {
      font-size: 14px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 6px;
    }
    .jumplinks-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .jumplinks-section li {
      margin-bottom: 4px;
    }
    .jumplinks-section a {
      display: inline-block;
      font-size: 13px;
      color: #2563eb;
      text-decoration: none;
      padding: 4px 0;
    }
    .jumplinks-section a:hover,
    .jumplinks-section a:focus {
      text-decoration: underline;
      outline: none;
    }
    .jumplinks-section a:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
      border-radius: 2px;
    }

    /* sr-only */
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
    }

    /* ── Toggle switch ── */
    .toggle-section {
      display: flex; align-items: center; gap: 12px; padding: 8px 0;
    }
    .toggle-switch {
      position: relative; display: inline-block; width: 48px; height: 26px; flex-shrink: 0;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; cursor: pointer; inset: 0;
      background-color: #ccc; transition: 0.3s; border-radius: 26px;
    }
    .slider::before {
      position: absolute; content: ""; height: 20px; width: 20px;
      left: 3px; bottom: 3px; background: #fff; transition: 0.3s; border-radius: 50%;
    }
    .toggle-switch input:checked + .slider { background-color: #2563eb; }
    .toggle-switch input:checked + .slider::before { transform: translateX(22px); }
    .toggle-switch input:focus + .slider { box-shadow: 0 0 0 3px rgba(37,99,235,0.3); }
    .toggle-label { font-weight: 600; font-size: 15px; }

    hr { border: none; border-top: 1px solid #e5e5e5; margin: 12px 0; }

    /* ── Settings sections ── */
    .settings-section { margin-bottom: 16px; }
    .settings-section h2 {
      font-size: 13px; font-weight: 600; color: #555;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
    }
    .setting-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    .setting-row label { font-size: 13px; color: #444; }

    .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .checkbox-label input[type="checkbox"] { width: 16px; height: 16px; accent-color: #2563eb; }

    input[type="color"] {
      width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 4px; padding: 2px; cursor: pointer;
    }
    input[type="range"] { flex: 1; height: 6px; accent-color: #2563eb; }
    output { font-size: 12px; color: #666; min-width: 30px; }

    select {
      padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px;
      font-size: 13px; background: #fff; cursor: pointer;
    }
    select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.2); }

    textarea {
      width: 100%;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      resize: vertical;
      min-height: 36px;
    }
    textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.2); }
    textarea.invalid { border-color: #dc2626; background: #fef2f2; }
    .selectors-row { flex-direction: column; align-items: stretch; }

    footer {
      margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e5e5;
      display: flex; justify-content: space-between; align-items: center;
    }
    .reset-btn {
      padding: 6px 12px; font-size: 12px; color: #666; background: #f5f5f5;
      border: 1px solid #ddd; border-radius: 4px; cursor: pointer; transition: background 0.2s;
    }
    .reset-btn:hover { background: #e5e5e5; }
    .reset-btn:focus { outline: none; box-shadow: 0 0 0 2px rgba(37,99,235,0.3); }
    .version { font-size: 11px; color: #999; }

    /* disabled state */
    .panel-body.disabled .settings-section {
      opacity: 0.5; pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .shiny-fab, .shiny-panel, .slider, .slider::before { transition: none !important; }
    }
  `;
  shadow.appendChild(style);

  // ── Floating button ──
  const fab = document.createElement('button');
  fab.className = 'shiny-fab';
  fab.setAttribute('aria-label', 'Open Shiny accessibility settings');
  // Static SVG icon — no dynamic content, safe to set via innerHTML
  fab.innerHTML = ACCESSIBILITY_ICON; // eslint-disable-line no-unsanitized/property
  shadow.appendChild(fab);

  // ── Settings panel ──
  const panel = document.createElement('div');
  panel.className = 'shiny-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Shiny accessibility settings');
  // Static template — no dynamic/user content, safe to set via innerHTML
  panel.innerHTML = PANEL_HTML; // eslint-disable-line no-unsanitized/property
  shadow.appendChild(panel);

  // ── Helpers to query inside shadow ──
  const $ = (id) => shadow.getElementById(id);

  // Enhancements that use the scope + selectors pattern
  const SCOPED_ENHANCEMENTS = ['outline', 'contrast', 'highlight', 'imageHdr'];

  function updateSelectorsRowVisibility(enhancement, scope) {
    const row = shadow.querySelector(`[data-selectors-for="${enhancement}"]`);
    if (row) row.style.display = scope === 'selectors' ? '' : 'none';
  }

  // ── Populate form from settings ──
  function populateForm(s) {
    $('sp-enabled').checked = s.enabled;

    for (const key of SCOPED_ENHANCEMENTS) {
      const scopeEl = $(`sp-${key}Scope`);
      const selectorsEl = $(`sp-${key}Selectors`);
      const scope = s[`${key}Scope`] || 'all';
      const selectors = Array.isArray(s[`${key}Selectors`]) ? s[`${key}Selectors`] : [];
      scopeEl.value = scope;
      selectorsEl.value = JSON.stringify(selectors);
      selectorsEl.classList.remove('invalid');
      updateSelectorsRowVisibility(key, scope);
    }

    $('sp-outlineColor').value = s.outlineColor;
    $('sp-outlineWidth').value = s.outlineWidth;
    $('sp-outlineWidthValue').textContent = s.outlineWidth + 'px';
    $('sp-contrastLevel').value = s.contrastLevel;
    $('sp-highlightColor').value = s.highlightColor;
    $('sp-focusIndicators').checked = s.focusIndicators;
    $('sp-imageHdrIntensity').value = s.imageHdrIntensity;
    updateDisabledState(s.enabled);
  }

  /**
   * Parse a textarea's JSON content into a string array.
   * Returns { ok: true, value } on success, { ok: false } on invalid JSON or wrong shape.
   */
  function parseSelectorsText(text) {
    const trimmed = text.trim();
    if (!trimmed) return { ok: true, value: [] };
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) return { ok: false };
      if (!parsed.every(s => typeof s === 'string')) return { ok: false };
      return { ok: true, value: parsed };
    } catch {
      return { ok: false };
    }
  }

  function updateDisabledState(enabled) {
    const body = shadow.querySelector('.panel-body');
    if (enabled) {
      body.classList.remove('disabled');
    } else {
      body.classList.add('disabled');
    }
  }

  /**
   * Build a settings snapshot from the form. Returns { ok, settings } — if any
   * selectors textarea has invalid JSON, ok is false and the caller should skip saving.
   */
  function collectSettings() {
    const s = {
      enabled: $('sp-enabled').checked,
      outlineColor: $('sp-outlineColor').value,
      outlineWidth: parseInt($('sp-outlineWidth').value, 10),
      contrastLevel: $('sp-contrastLevel').value,
      highlightColor: $('sp-highlightColor').value,
      focusIndicators: $('sp-focusIndicators').checked,
      imageHdrIntensity: $('sp-imageHdrIntensity').value
    };

    let ok = true;
    for (const key of SCOPED_ENHANCEMENTS) {
      const scope = $(`sp-${key}Scope`).value;
      const selectorsEl = $(`sp-${key}Selectors`);
      s[`${key}Scope`] = scope;
      const parsed = parseSelectorsText(selectorsEl.value);
      if (parsed.ok) {
        s[`${key}Selectors`] = parsed.value;
        selectorsEl.classList.remove('invalid');
      } else {
        selectorsEl.classList.add('invalid');
        ok = false;
      }
    }
    return { ok, settings: s };
  }

  async function saveAndNotify() {
    const { ok, settings } = collectSettings();
    if (!ok) return; // invalid selectors JSON — skip saving, the field shows red
    await ShinyStorage.set(settings);
    // Shiny (content.js) picks this up via chrome.storage.onChanged
  }

  // ── Wire up events ──
  fab.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('open');
    fab.setAttribute('aria-expanded', String(isOpen));
    fab.setAttribute('aria-label',
      isOpen ? 'Close Shiny accessibility settings' : 'Open Shiny accessibility settings');
  });

  // Close panel on Escape
  shadow.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      panel.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', 'Open Shiny accessibility settings');
      fab.focus();
    }
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!host.contains(e.target) && panel.classList.contains('open')) {
      panel.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      fab.setAttribute('aria-label', 'Open Shiny accessibility settings');
    }
  });

  // Global enable toggle
  $('sp-enabled').addEventListener('change', async (e) => {
    updateDisabledState(e.target.checked);
    await saveAndNotify();
  });

  // All other inputs, selects, textareas
  shadow.querySelectorAll('input:not(#sp-enabled), select, textarea').forEach(input => {
    input.addEventListener('change', () => saveAndNotify());
  });

  // Scope selects: toggle the selectors textarea visibility immediately
  shadow.querySelectorAll('[data-scope-for]').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const key = sel.getAttribute('data-scope-for');
      updateSelectorsRowVisibility(key, e.target.value);
    });
  });

  // Selectors textareas: also validate on 'input' for immediate feedback
  shadow.querySelectorAll('textarea[id$="Selectors"]').forEach(ta => {
    ta.addEventListener('input', () => {
      const parsed = parseSelectorsText(ta.value);
      ta.classList.toggle('invalid', !parsed.ok);
    });
  });

  // Range display
  $('sp-outlineWidth').addEventListener('input', (e) => {
    $('sp-outlineWidthValue').textContent = e.target.value + 'px';
  });

  // Reset
  $('sp-resetBtn').addEventListener('click', async () => {
    await ShinyStorage.reset();
    const settings = await ShinyStorage.get();
    populateForm(settings);
  });

  // ── Listen for toolbar icon toggle ──
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TOGGLE_FLOATING_BUTTON') {
      if (message.visible) {
        fab.classList.remove('hidden');
      } else {
        fab.classList.add('hidden');
        panel.classList.remove('open');
        fab.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // ── Listen for storage changes to keep panel in sync ──
  ShinyStorage.onChange((newSettings) => {
    populateForm(newSettings);
  });

  // ── URL matching helper ──
  // Exact match first, then longest prefix match.
  function findUrlMatch(entries, pageUrl) {
    let match = null;
    let longestPrefix = 0;
    for (const entry of entries) {
      if (pageUrl === entry.url) return entry;
      if (pageUrl.startsWith(entry.url) && entry.url.length > longestPrefix) {
        match = entry;
        longestPrefix = entry.url.length;
      }
    }
    return match;
  }

  async function loadJson(path) {
    const response = await fetch(chrome.runtime.getURL(path));
    return response.json();
  }

  // ── Page-specific instructions ──
  async function loadInstructions() {
    try {
      const entries = await loadJson('data/instructions.json');
      const match = findUrlMatch(entries, window.location.href);

      const section = $('sp-instructions-section');
      const textEl = $('sp-instructions-text');
      if (match) {
        textEl.textContent = match.text;
        section.style.display = '';
      } else {
        section.style.display = 'none';
      }
    } catch (e) {
      console.warn('Shiny: Could not load instructions', e);
    }
  }

  // ── Page-specific jump links ──
  function resolveXPath(xpath) {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const node = result.singleNodeValue;
    return node instanceof Element ? node : null;
  }

  function buildJumpLink(link) {
    const a = document.createElement('a');
    a.textContent = link.text;
    if (link.lang) a.setAttribute('lang', link.lang);

    if (link.xpath) {
      const target = resolveXPath(link.xpath);
      if (!target) {
        console.warn('Shiny: Jump link XPath did not resolve', link.xpath);
        return null;
      }
      // Assign id if not present, or sync to requested id
      if (link.id && target.id !== link.id) {
        target.id = link.id;
      } else if (!target.id) {
        target.id = `shiny-jump-${Math.random().toString(36).slice(2, 10)}`;
      }
      a.href = `#${target.id}`;
      // Smooth scroll + focus the target for accessibility
      a.addEventListener('click', (e) => {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Make the target focusable if it isn't, then focus it
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
        }
        target.focus({ preventScroll: true });
      });
    } else if (link.href) {
      a.href = link.href;
      // Open non-hash, non-same-origin links in a new tab
      try {
        const u = new URL(link.href, window.location.href);
        if (u.origin !== window.location.origin) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
      } catch {
        // Bad URL — leave as-is
      }
    } else {
      return null;
    }

    const li = document.createElement('li');
    li.appendChild(a);
    return li;
  }

  async function loadJumpLinks() {
    try {
      const entries = await loadJson('data/jumplinks.json');
      const match = findUrlMatch(entries, window.location.href);

      const section = $('sp-jumplinks-section');
      const list = $('sp-jumplinks-list');
      list.replaceChildren();

      if (!match?.links?.length) {
        section.style.display = 'none';
        return;
      }

      for (const link of match.links) {
        const li = buildJumpLink(link);
        if (li) list.appendChild(li);
      }

      section.style.display = list.children.length ? '' : 'none';
    } catch (e) {
      console.warn('Shiny: Could not load jump links', e);
    }
  }

  // ── Page-specific anchor positioning ──
  let anchorElement = null;
  let anchorObserver = null;

  function positionFabOverAnchor() {
    if (!anchorElement || !anchorElement.isConnected) return;
    const rect = anchorElement.getBoundingClientRect();
    // Center the 48px FAB over the element's bounding box
    const fabSize = 48;
    const top = rect.top + rect.height / 2 - fabSize / 2;
    const left = rect.left + rect.width / 2 - fabSize / 2;
    fab.style.top = `${top}px`;
    fab.style.left = `${left}px`;
  }

  function clearAnchor() {
    if (anchorObserver) {
      anchorObserver.disconnect();
      anchorObserver = null;
    }
    anchorElement = null;
    fab.classList.remove('anchored');
    fab.style.top = '';
    fab.style.left = '';
    window.removeEventListener('scroll', positionFabOverAnchor, true);
    window.removeEventListener('resize', positionFabOverAnchor);
  }

  async function loadAnchors() {
    try {
      const entries = await loadJson('data/anchors.json');
      const match = findUrlMatch(entries, window.location.href);
      if (!match?.xpath) return;

      const result = document.evaluate(
        match.xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const target = result.singleNodeValue;
      if (!(target instanceof Element)) {
        console.warn('Shiny: Anchor XPath did not resolve to an element', match.xpath);
        return;
      }

      anchorElement = target;
      fab.classList.add('anchored');
      positionFabOverAnchor();

      // Keep position in sync on scroll/resize and when the element itself changes size
      window.addEventListener('scroll', positionFabOverAnchor, { capture: true, passive: true });
      window.addEventListener('resize', positionFabOverAnchor, { passive: true });
      anchorObserver = new ResizeObserver(positionFabOverAnchor);
      anchorObserver.observe(anchorElement);
    } catch (e) {
      console.warn('Shiny: Could not load anchors', e);
    }
  }

  // ── Initialize ──
  async function init() {
    try {
      // Load settings and populate the form
      const settings = await ShinyStorage.get();
      populateForm(settings);

      // Load page-specific instructions
      await loadInstructions();

      // Load page-specific jump links
      await loadJumpLinks();

      // Load page-specific anchor position for the FAB
      await loadAnchors();

      // Check if floating button should be visible
      const result = await chrome.storage.sync.get('floatingButtonVisible');
      const visible = result.floatingButtonVisible ?? true;
      if (!visible) {
        fab.classList.add('hidden');
      }

      // Inject into page
      document.documentElement.appendChild(host);
    } catch (e) {
      console.error('Shiny: Floating panel init failed', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
