/**
 * Shiny - Main content script
 * Orchestrates SVG detection and enhancement
 */

(function() {
  'use strict';

  // Main controller
  const Shiny = {
    detector: null,
    enhancer: null,
    settings: null,
    initialized: false,
    imageObserver: null,

    /**
     * Initialize Shiny
     */
    async init() {
      if (this.initialized) return;

      try {
        // Load settings
        this.settings = await ShinyStorage.get();

        // Initialize detector and enhancer
        this.detector = new SVGDetector();
        this.enhancer = new SVGEnhancer();

        // Start detecting SVGs
        this.detector.start((svgInfo) => {
          this.onSVGDetected(svgInfo);
        });

        // Listen for settings changes
        ShinyStorage.onChange((newSettings) => {
          this.onSettingsChanged(newSettings);
        });

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message.type === 'SETTINGS_UPDATED') {
            this.onSettingsChanged(message.settings);
          }
        });

        // Initialize image HDR if enabled
        this.initImageHdr();

        this.initialized = true;
        console.log('Shiny: Initialized');
      } catch (e) {
        console.error('Shiny: Initialization failed', e);
      }
    },

    /**
     * Initialize image HDR enhancement
     */
    initImageHdr() {
      // Apply to existing images
      this.applyImageHdr();

      // Watch for new images and videos
      this.imageObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'IMG') {
                  this.applyHdrToImage(node);
                } else if (node.tagName === 'VIDEO') {
                  this.applyHdrToVideo(node);
                } else if (node.querySelectorAll) {
                  node.querySelectorAll('img').forEach(img => {
                    this.applyHdrToImage(img);
                  });
                  node.querySelectorAll('video').forEach(video => {
                    this.applyHdrToVideo(video);
                  });
                }
              }
            });
          }
        }
      });

      this.imageObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    },

    /**
     * Apply HDR effect to all images and videos on the page
     */
    applyImageHdr() {
      if (!this.settings?.enabled || !this.settings?.imageHdrEnabled) {
        return;
      }

      document.querySelectorAll('img').forEach(img => {
        this.applyHdrToImage(img);
      });

      document.querySelectorAll('video').forEach(video => {
        this.applyHdrToVideo(video);
      });
    },

    /**
     * Apply HDR effect to a single image
     * @param {HTMLImageElement} img - Image element
     */
    applyHdrToImage(img) {
      if (!this.settings?.enabled || !this.settings?.imageHdrEnabled) {
        return;
      }

      // Skip SVG images (handled by SVG enhancer)
      if (img.src?.endsWith('.svg') || img.src?.includes('.svg?')) {
        return;
      }

      // Remove any existing HDR classes
      img.classList.remove('shiny-hdr', 'shiny-hdr-low', 'shiny-hdr-medium', 'shiny-hdr-high');

      // Apply HDR classes
      img.classList.add('shiny-hdr', `shiny-hdr-${this.settings.imageHdrIntensity}`);
    },

    /**
     * Apply HDR effect to a single video
     * @param {HTMLVideoElement} video - Video element
     */
    applyHdrToVideo(video) {
      if (!this.settings?.enabled || !this.settings?.imageHdrEnabled) {
        return;
      }

      // Remove any existing HDR classes
      video.classList.remove('shiny-hdr', 'shiny-hdr-low', 'shiny-hdr-medium', 'shiny-hdr-high');

      // Apply HDR classes
      video.classList.add('shiny-hdr', `shiny-hdr-${this.settings.imageHdrIntensity}`);
    },

    /**
     * Remove HDR effect from all images and videos
     */
    removeImageHdr() {
      document.querySelectorAll('.shiny-hdr').forEach(el => {
        el.classList.remove('shiny-hdr', 'shiny-hdr-low', 'shiny-hdr-medium', 'shiny-hdr-high');
      });
    },

    /**
     * Handle detected SVG
     * @param {Object} svgInfo - SVG info from detector
     */
    onSVGDetected(svgInfo) {
      if (this.settings?.enabled) {
        this.enhancer.enhance(svgInfo, this.settings);
      }
    },

    /**
     * Handle settings changes
     * @param {Object} newSettings - New settings
     */
    onSettingsChanged(newSettings) {
      const wasEnabled = this.settings?.enabled;
      const wasHdrEnabled = this.settings?.imageHdrEnabled;
      this.settings = newSettings;

      if (!newSettings.enabled && wasEnabled) {
        // Disabled - restore all
        this.enhancer.restoreAll();
        this.removeImageHdr();
      } else if (newSettings.enabled) {
        // Re-enhance all detected SVGs with new settings
        this.reenhanceAll();

        // Handle HDR changes
        if (newSettings.imageHdrEnabled) {
          // Remove old HDR classes and reapply with new intensity
          this.removeImageHdr();
          this.applyImageHdr();
        } else if (wasHdrEnabled) {
          // HDR was disabled
          this.removeImageHdr();
        }
      }
    },

    /**
     * Re-enhance all SVGs with current settings
     */
    reenhanceAll() {
      // Find all SVGs and re-apply enhancements
      const svgs = document.querySelectorAll('svg');
      svgs.forEach(svg => {
        this.enhancer.enhance({ type: 'inline', element: svg }, this.settings);
      });

      // Also handle img/object/embed SVGs
      document.querySelectorAll('img[src$=".svg"], img[src*=".svg?"]').forEach(img => {
        this.enhancer.enhance({ type: 'img', element: img }, this.settings);
      });

      document.querySelectorAll('object[type="image/svg+xml"], object[data$=".svg"]').forEach(obj => {
        this.enhancer.enhance({ type: 'object', element: obj }, this.settings);
      });
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Shiny.init());
  } else {
    Shiny.init();
  }

  // Expose for debugging
  window.Shiny = Shiny;
})();
