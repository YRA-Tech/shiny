/**
 * Shiny - SVG Detector
 * Detects SVGs on pages including those within Lottie animations
 */

class SVGDetector {
  constructor() {
    this.observer = null;
    this.shadowObservers = new WeakMap();
    this.detectedSVGs = new WeakSet();
    this.onSVGDetected = null;
  }

  /**
   * Start detecting SVGs on the page
   * @param {Function} callback - Called when an SVG is detected
   */
  start(callback) {
    this.onSVGDetected = callback;

    // Detect existing SVGs
    const existing = this.detectExisting();
    existing.forEach(svgInfo => {
      this.registerSVG(svgInfo);
    });

    // Watch for dynamically added SVGs
    this.observeDynamicContent();
  }

  /**
   * Stop detecting SVGs
   */
  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    // Disconnect all shadow observers
    this.shadowObservers = new WeakMap();
  }

  /**
   * Query elements including those within shadow DOMs
   * @param {string} selector - CSS selector
   * @param {Element|Document} root - Root element to search from
   * @returns {Array} Array of matching elements
   */
  querySelectorAllDeep(selector, root = document) {
    const elements = [...root.querySelectorAll(selector)];

    // Find all elements with shadow roots and search within them
    this.traverseShadowRoots(root, (shadowRoot) => {
      elements.push(...shadowRoot.querySelectorAll(selector));
    });

    return elements;
  }

  /**
   * Traverse all shadow roots within an element
   * @param {Element|Document} root - Root element to search from
   * @param {Function} callback - Called for each shadow root found
   */
  traverseShadowRoots(root, callback) {
    const elements = root.querySelectorAll('*');
    for (const el of elements) {
      if (el.shadowRoot) {
        callback(el.shadowRoot);
        // Recursively traverse nested shadow roots
        this.traverseShadowRoots(el.shadowRoot, callback);
      }
    }
  }

  /**
   * Detect all SVG types on the page
   * @returns {Array} Array of SVG info objects
   */
  detectExisting() {
    const svgElements = [];

    // 1. Inline SVG elements (including shadow DOM)
    this.querySelectorAllDeep('svg').forEach(svg => {
      svgElements.push({ type: 'inline', element: svg });
    });

    // 2. SVG via <img> tags (including shadow DOM)
    this.querySelectorAllDeep('img[src$=".svg"], img[src*=".svg?"]').forEach(img => {
      svgElements.push({ type: 'img', element: img });
    });

    // 3. SVG via <object> tags (including shadow DOM)
    this.querySelectorAllDeep('object[type="image/svg+xml"], object[data$=".svg"]').forEach(obj => {
      svgElements.push({ type: 'object', element: obj });
    });

    // 4. SVG via <embed> tags (including shadow DOM)
    this.querySelectorAllDeep('embed[type="image/svg+xml"], embed[src$=".svg"]').forEach(embed => {
      svgElements.push({ type: 'embed', element: embed });
    });

    // 5. Lottie animations
    this.detectLottieContainers().forEach(info => {
      svgElements.push(info);
    });

    return svgElements;
  }

  /**
   * Detect Lottie animation containers
   * @returns {Array} Array of Lottie container info
   */
  detectLottieContainers() {
    const lottieElements = [];

    // Method 1: Detect by common class names (including shadow DOM)
    this.querySelectorAllDeep('.lottie, .bodymovin, .lottie-animation').forEach(container => {
      const svg = container.querySelector('svg');
      if (svg) {
        lottieElements.push({ type: 'lottie', element: svg, container });
      }
    });

    // Method 2: Detect <lottie-player> and <dotlottie-player> custom elements (including shadow DOM)
    this.querySelectorAllDeep('lottie-player, dotlottie-player').forEach(player => {
      // Look for SVG in shadow DOM or regular DOM
      let svg = player.querySelector('svg');
      if (!svg && player.shadowRoot) {
        svg = player.shadowRoot.querySelector('svg');
      }
      if (svg) {
        lottieElements.push({ type: 'lottie', element: svg, container: player });
      } else {
        // SVG not yet rendered, set up observer
        this.observeLottieContainer(player);
      }
    });

    // Method 3: Detect by data attributes used by lottie-web (including shadow DOM)
    this.querySelectorAllDeep('[data-animation-path], [data-anim-loop], [data-bm-renderer]').forEach(container => {
      const svg = container.querySelector('svg');
      if (svg) {
        lottieElements.push({ type: 'lottie', element: svg, container });
      }
    });

    // Method 4: Detect SVGs with Lottie-specific markers (including shadow DOM)
    this.querySelectorAllDeep('svg[data-bm], svg.bodymovin').forEach(svg => {
      if (!lottieElements.some(item => item.element === svg)) {
        lottieElements.push({ type: 'lottie', element: svg, container: svg.parentElement });
      }
    });

    return lottieElements;
  }

  /**
   * Observe a Lottie container for SVG rendering
   * @param {Element} container - Lottie container element
   */
  observeLottieContainer(container) {
    const lottieObserver = new MutationObserver((mutations, obs) => {
      let svg = container.querySelector('svg');
      if (!svg && container.shadowRoot) {
        svg = container.shadowRoot.querySelector('svg');
      }

      if (svg) {
        this.registerSVG({ type: 'lottie', element: svg, container });
        obs.disconnect();
      }
    });

    // Observe both the container and its shadow root if present
    lottieObserver.observe(container, { childList: true, subtree: true });
    if (container.shadowRoot) {
      lottieObserver.observe(container.shadowRoot, { childList: true, subtree: true });
    }

    // Timeout fallback - stop observing after 10 seconds
    setTimeout(() => lottieObserver.disconnect(), 10000);
  }

  /**
   * Watch for dynamically added SVGs
   */
  observeDynamicContent() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkNodeForSVG(node);
            }
          });
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also observe existing shadow roots
    this.observeExistingShadowRoots();
  }

  /**
   * Observe all existing shadow roots for dynamic content
   */
  observeExistingShadowRoots() {
    this.traverseShadowRoots(document, (shadowRoot) => {
      this.observeShadowRoot(shadowRoot);
    });
  }

  /**
   * Set up a mutation observer for a shadow root
   * @param {ShadowRoot} shadowRoot - The shadow root to observe
   */
  observeShadowRoot(shadowRoot) {
    if (this.shadowObservers.has(shadowRoot)) {
      return; // Already observing
    }

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkNodeForSVG(node);
            }
          });
        }
      }
    });

    observer.observe(shadowRoot, {
      childList: true,
      subtree: true
    });

    this.shadowObservers.set(shadowRoot, observer);
  }

  /**
   * Check a node and its children for SVGs
   * @param {Element} node - DOM node to check
   */
  checkNodeForSVG(node) {
    // Check if node itself is an SVG
    if (node.nodeName.toLowerCase() === 'svg') {
      this.registerSVG({ type: 'inline', element: node });
      return;
    }

    // Check if node is a Lottie player
    const tagName = node.tagName?.toLowerCase();
    if (tagName === 'lottie-player' || tagName === 'dotlottie-player') {
      this.observeLottieContainer(node);
      return;
    }

    // Check for SVGs within the added node
    if (node.querySelectorAll) {
      node.querySelectorAll('svg').forEach(svg => {
        this.registerSVG({ type: 'inline', element: svg });
      });

      // Check for Lottie containers
      node.querySelectorAll('lottie-player, dotlottie-player').forEach(player => {
        this.observeLottieContainer(player);
      });

      // Check for elements with shadow roots and observe them
      node.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
          this.observeShadowRoot(el.shadowRoot);
          // Check for SVGs already in the shadow root
          el.shadowRoot.querySelectorAll('svg').forEach(svg => {
            this.registerSVG({ type: 'inline', element: svg });
          });
        }
      });
    }

    // Check if the node itself has a shadow root
    if (node.shadowRoot) {
      this.observeShadowRoot(node.shadowRoot);
      node.shadowRoot.querySelectorAll('svg').forEach(svg => {
        this.registerSVG({ type: 'inline', element: svg });
      });
    }
  }

  /**
   * Register a detected SVG
   * @param {Object} svgInfo - SVG info object
   */
  registerSVG(svgInfo) {
    if (!this.detectedSVGs.has(svgInfo.element)) {
      this.detectedSVGs.add(svgInfo.element);

      if (this.onSVGDetected) {
        this.onSVGDetected(svgInfo);
      }
    }
  }
}

// Make available globally
window.SVGDetector = SVGDetector;
