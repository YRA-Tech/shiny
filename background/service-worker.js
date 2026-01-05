/**
 * Shiny - Background service worker
 * Handles extension lifecycle and messaging
 */

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Shiny: Extension installed');

    // Set default settings
    const defaultSettings = {
      enabled: true,
      outlineEnabled: true,
      outlineColor: '#000000',
      outlineWidth: 2,
      contrastEnabled: true,
      contrastLevel: 'high',
      highlightEnabled: true,
      highlightColor: '#FFFF00',
      focusIndicators: true
    };

    await chrome.storage.sync.set({ settings: defaultSettings });
  } else if (details.reason === 'update') {
    console.log('Shiny: Extension updated to version', chrome.runtime.getManifest().version);
  }
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
