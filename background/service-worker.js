/**
 * Shiny - Background service worker
 * Handles extension lifecycle and messaging
 */

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Shiny: Extension installed');

    // Set default settings (kept in sync with ShinyStorage.defaultSettings)
    const defaultSettings = {
      enabled: true,
      outlineScope: 'all',
      outlineSelectors: [],
      outlineColor: '#000000',
      outlineWidth: 2,
      contrastScope: 'all',
      contrastSelectors: [],
      contrastLevel: 'high',
      highlightScope: 'all',
      highlightSelectors: [],
      highlightColor: '#FFFF00',
      focusIndicators: true,
      imageHdrScope: 'none',
      imageHdrSelectors: [],
      imageHdrIntensity: 'medium'
    };

    await chrome.storage.sync.set({ settings: defaultSettings });

    // Floating button starts visible
    await chrome.storage.sync.set({ floatingButtonVisible: true });
  } else if (details.reason === 'update') {
    console.log('Shiny: Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Toolbar icon click toggles the floating button visibility on the active tab
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  // Toggle stored visibility state
  const result = await chrome.storage.sync.get('floatingButtonVisible');
  const newVisible = !(result.floatingButtonVisible ?? true);
  await chrome.storage.sync.set({ floatingButtonVisible: newVisible });

  // Notify the active tab
  chrome.tabs.sendMessage(tab.id, {
    type: 'TOGGLE_FLOATING_BUTTON',
    visible: newVisible
  }).catch(() => {
    // Content script may not be loaded on some pages
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('settings').then((result) => {
      sendResponse(result.settings);
    });
    return true; // Indicates async response
  }

  if (message.type === 'REFRESH_TAB') {
    // Refresh the active tab to apply new settings
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
      }
    });
  }
});
