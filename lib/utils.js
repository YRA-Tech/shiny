/**
 * Shiny - Storage utilities for settings management
 */

const ShinyStorage = {
  defaultSettings: {
    // Global toggle
    enabled: true,

    // Outline settings
    outlineEnabled: true,
    outlineColor: '#000000',
    outlineWidth: 2,

    // Contrast settings
    contrastEnabled: true,
    contrastLevel: 'high', // 'medium', 'high', 'maximum'

    // Highlighting settings
    highlightEnabled: true,
    highlightColor: '#FFFF00',

    // Focus indicators
    focusIndicators: true,

    // Image HDR enhancement
    imageHdrEnabled: false,
    imageHdrIntensity: 'medium' // 'low', 'medium', 'high'
  },

  /**
   * Get current settings, merged with defaults
   * @returns {Promise<Object>} Settings object
   */
  async get() {
    try {
      const result = await chrome.storage.sync.get('settings');
      return { ...this.defaultSettings, ...result.settings };
    } catch (e) {
      // Fallback to local storage if sync fails
      try {
        const result = await chrome.storage.local.get('settings');
        return { ...this.defaultSettings, ...result.settings };
      } catch (e2) {
        console.warn('Shiny: Could not load settings, using defaults', e2);
        return { ...this.defaultSettings };
      }
    }
  },

  /**
   * Save settings
   * @param {Object} settings - Settings to save
   * @returns {Promise<void>}
   */
  async set(settings) {
    try {
      await chrome.storage.sync.set({ settings });
    } catch (e) {
      // Fallback to local storage if sync fails (quota exceeded, etc.)
      console.warn('Shiny: Sync storage failed, using local', e);
      await chrome.storage.local.set({ settings });
    }
  },

  /**
   * Reset settings to defaults
   * @returns {Promise<void>}
   */
  async reset() {
    await this.set({ ...this.defaultSettings });
  },

  /**
   * Listen for settings changes
   * @param {Function} callback - Called with new settings when they change
   */
  onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (changes.settings) {
        callback(changes.settings.newValue);
      }
    });
  }
};

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.ShinyStorage = ShinyStorage;
}
