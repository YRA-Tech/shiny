/**
 * Shiny - Popup script for settings management
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Load current settings
  const settings = await ShinyStorage.get();
  populateForm(settings);
  updateDisabledState(settings.enabled);

  // Set up event listeners
  setupEventListeners();
});

/**
 * Populate form fields with current settings
 */
function populateForm(settings) {
  document.getElementById('enabled').checked = settings.enabled;
  document.getElementById('outlineEnabled').checked = settings.outlineEnabled;
  document.getElementById('outlineColor').value = settings.outlineColor;
  document.getElementById('outlineWidth').value = settings.outlineWidth;
  document.getElementById('outlineWidthValue').textContent = settings.outlineWidth + 'px';
  document.getElementById('contrastEnabled').checked = settings.contrastEnabled;
  document.getElementById('contrastLevel').value = settings.contrastLevel;
  document.getElementById('highlightEnabled').checked = settings.highlightEnabled;
  document.getElementById('highlightColor').value = settings.highlightColor;
  document.getElementById('focusIndicators').checked = settings.focusIndicators;
  document.getElementById('imageHdrEnabled').checked = settings.imageHdrEnabled;
  document.getElementById('imageHdrIntensity').value = settings.imageHdrIntensity;
}

/**
 * Set up event listeners for all form controls
 */
function setupEventListeners() {
  // Global enable toggle
  document.getElementById('enabled').addEventListener('change', async (e) => {
    await saveSettings();
    updateDisabledState(e.target.checked);
    notifyContentScript();
  });

  // All other inputs save on change
  const inputs = document.querySelectorAll('input:not(#enabled), select');
  inputs.forEach(input => {
    input.addEventListener('change', async () => {
      await saveSettings();
      notifyContentScript();
    });
  });

  // Range input - update output display
  document.getElementById('outlineWidth').addEventListener('input', (e) => {
    document.getElementById('outlineWidthValue').textContent = e.target.value + 'px';
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', async () => {
    await ShinyStorage.reset();
    const settings = await ShinyStorage.get();
    populateForm(settings);
    updateDisabledState(settings.enabled);
    notifyContentScript();
  });
}

/**
 * Save current form values to storage
 */
async function saveSettings() {
  const settings = {
    enabled: document.getElementById('enabled').checked,
    outlineEnabled: document.getElementById('outlineEnabled').checked,
    outlineColor: document.getElementById('outlineColor').value,
    outlineWidth: parseInt(document.getElementById('outlineWidth').value, 10),
    contrastEnabled: document.getElementById('contrastEnabled').checked,
    contrastLevel: document.getElementById('contrastLevel').value,
    highlightEnabled: document.getElementById('highlightEnabled').checked,
    highlightColor: document.getElementById('highlightColor').value,
    focusIndicators: document.getElementById('focusIndicators').checked,
    imageHdrEnabled: document.getElementById('imageHdrEnabled').checked,
    imageHdrIntensity: document.getElementById('imageHdrIntensity').value
  };

  await ShinyStorage.set(settings);
}

/**
 * Update UI disabled state based on global toggle
 */
function updateDisabledState(enabled) {
  const container = document.querySelector('.popup-container');
  if (enabled) {
    container.classList.remove('disabled');
  } else {
    container.classList.add('disabled');
  }
}

/**
 * Notify content script of settings change
 */
async function notifyContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const settings = await ShinyStorage.get();
      chrome.tabs.sendMessage(tab.id, {
        type: 'SETTINGS_UPDATED',
        settings
      }).catch(() => {
        // Content script may not be loaded on some pages (chrome://, etc.)
      });
    }
  } catch (e) {
    // Ignore errors for pages where content script isn't running
  }
}
