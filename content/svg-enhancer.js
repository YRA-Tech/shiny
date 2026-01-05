/**
 * Shiny - SVG Enhancer
 * Applies visibility enhancements to SVGs
 */

class SVGEnhancer {
  constructor() {
    this.enhancedElements = new WeakMap();
  }

  /**
   * Enhance an SVG based on settings
   * @param {Object} svgInfo - SVG info from detector
   * @param {Object} settings - Current settings
   */
  enhance(svgInfo, settings) {
    if (!settings.enabled) {
      this.restore(svgInfo.element);
      return;
    }

    const { element, type } = svgInfo;

    if (type === 'inline' || type === 'lottie') {
      this.enhanceInlineSVG(element, settings);
    } else if (type === 'img') {
      this.enhanceImgSVG(element, settings);
    } else if (type === 'object' || type === 'embed') {
      this.enhanceEmbeddedSVG(element, settings);
    }
  }

  /**
   * Enhance an inline SVG element
   * @param {SVGElement} svg - SVG element
   * @param {Object} settings - Current settings
   */
  enhanceInlineSVG(svg, settings) {
    // Store original state for restoration
    if (!this.enhancedElements.has(svg)) {
      this.enhancedElements.set(svg, {
        originalFilter: svg.style.filter,
        modifiedShapes: []
      });
    }

    const stored = this.enhancedElements.get(svg);

    // Apply outline enhancement
    if (settings.outlineEnabled) {
      this.addOutlines(svg, settings, stored);
    } else {
      this.removeOutlines(svg, stored);
    }

    // Apply contrast enhancement
    if (settings.contrastEnabled) {
      this.enhanceContrast(svg, settings);
    } else {
      svg.style.filter = stored.originalFilter || '';
    }

    // Apply element highlighting
    if (settings.highlightEnabled) {
      this.addHighlighting(svg, settings);
    } else {
      this.removeHighlighting(svg);
    }

    // Apply focus indicators
    if (settings.focusIndicators) {
      this.addFocusIndicators(svg);
    } else {
      this.removeFocusIndicators(svg);
    }

    // Mark SVG as enhanced
    svg.classList.add('shiny-enhanced');
  }

  /**
   * Add outlines to SVG shapes
   * @param {SVGElement} svg - SVG element
   * @param {Object} settings - Current settings
   * @param {Object} stored - Stored original state
   */
  addOutlines(svg, settings, stored) {
    const shapes = svg.querySelectorAll(
      'path, rect, circle, ellipse, polygon, polyline, line, text'
    );

    shapes.forEach(shape => {
      // Skip shapes that are clipping paths or masks
      if (shape.closest('clipPath') || shape.closest('mask') || shape.closest('defs')) {
        return;
      }

      // Store original values if not already stored
      if (!shape.dataset.shinyOriginalStroke) {
        shape.dataset.shinyOriginalStroke = shape.getAttribute('stroke') || '';
        shape.dataset.shinyOriginalStrokeWidth = shape.getAttribute('stroke-width') || '';
        shape.dataset.shinyOriginalPaintOrder = shape.style.paintOrder || '';
        stored.modifiedShapes.push(shape);
      }

      // Apply outline
      shape.setAttribute('stroke', settings.outlineColor);
      shape.setAttribute('stroke-width', settings.outlineWidth);

      // Use paint-order to put stroke behind fill
      const fill = shape.getAttribute('fill');
      if (fill && fill !== 'none' && fill !== 'transparent') {
        shape.style.paintOrder = 'stroke fill';
      }

      shape.classList.add('shiny-outlined');
    });
  }

  /**
   * Remove outlines from SVG shapes
   * @param {SVGElement} svg - SVG element
   * @param {Object} stored - Stored original state
   */
  removeOutlines(svg, stored) {
    stored.modifiedShapes.forEach(shape => {
      const originalStroke = shape.dataset.shinyOriginalStroke;
      const originalStrokeWidth = shape.dataset.shinyOriginalStrokeWidth;
      const originalPaintOrder = shape.dataset.shinyOriginalPaintOrder;

      if (originalStroke) {
        shape.setAttribute('stroke', originalStroke);
      } else {
        shape.removeAttribute('stroke');
      }

      if (originalStrokeWidth) {
        shape.setAttribute('stroke-width', originalStrokeWidth);
      } else {
        shape.removeAttribute('stroke-width');
      }

      shape.style.paintOrder = originalPaintOrder;
      shape.classList.remove('shiny-outlined');
    });
  }

  /**
   * Enhance contrast of SVG
   * @param {SVGElement} svg - SVG element
   * @param {Object} settings - Current settings
   */
  enhanceContrast(svg, settings) {
    const contrastFilters = {
      medium: 'contrast(1.3) saturate(1.2)',
      high: 'contrast(1.6) saturate(1.4)',
      maximum: 'contrast(2.0) saturate(1.6)'
    };

    const existingFilter = this.enhancedElements.get(svg)?.originalFilter || '';
    const contrastFilter = contrastFilters[settings.contrastLevel] || contrastFilters.high;

    // Combine with any existing filters
    svg.style.filter = existingFilter ? `${existingFilter} ${contrastFilter}` : contrastFilter;
  }

  /**
   * Add highlighting to interactive elements
   * @param {SVGElement} svg - SVG element
   * @param {Object} settings - Current settings
   */
  addHighlighting(svg, settings) {
    // Find interactive elements
    const interactiveElements = svg.querySelectorAll(
      '[onclick], [tabindex], a, [role="button"], [role="link"], [cursor="pointer"]'
    );

    interactiveElements.forEach(el => {
      el.classList.add('shiny-highlightable');
      el.style.setProperty('--shiny-highlight-color', settings.highlightColor);
    });

    // Also check for elements with pointer cursor in computed style
    svg.querySelectorAll('*').forEach(el => {
      try {
        const style = getComputedStyle(el);
        if (style.cursor === 'pointer' && !el.classList.contains('shiny-highlightable')) {
          el.classList.add('shiny-highlightable');
          el.style.setProperty('--shiny-highlight-color', settings.highlightColor);
        }
      } catch (e) {
        // Ignore errors from pseudo-elements, etc.
      }
    });
  }

  /**
   * Remove highlighting from elements
   * @param {SVGElement} svg - SVG element
   */
  removeHighlighting(svg) {
    svg.querySelectorAll('.shiny-highlightable').forEach(el => {
      el.classList.remove('shiny-highlightable');
      el.style.removeProperty('--shiny-highlight-color');
    });
  }

  /**
   * Add focus indicators to focusable elements
   * @param {SVGElement} svg - SVG element
   */
  addFocusIndicators(svg) {
    const focusableElements = svg.querySelectorAll(
      'a, [tabindex]:not([tabindex="-1"]), [onclick], [role="button"], [role="link"]'
    );

    focusableElements.forEach(el => {
      el.classList.add('shiny-focusable');

      // Add tabindex if element is interactive but not focusable
      if (!el.hasAttribute('tabindex') && (el.hasAttribute('onclick') || el.getAttribute('role'))) {
        el.setAttribute('tabindex', '0');
        el.dataset.shinyAddedTabindex = 'true';
      }
    });
  }

  /**
   * Remove focus indicators
   * @param {SVGElement} svg - SVG element
   */
  removeFocusIndicators(svg) {
    svg.querySelectorAll('.shiny-focusable').forEach(el => {
      el.classList.remove('shiny-focusable');

      // Remove tabindex if we added it
      if (el.dataset.shinyAddedTabindex) {
        el.removeAttribute('tabindex');
        delete el.dataset.shinyAddedTabindex;
      }
    });
  }

  /**
   * Enhance an SVG loaded via <img> tag (limited to CSS filters)
   * @param {HTMLImageElement} img - Image element
   * @param {Object} settings - Current settings
   */
  enhanceImgSVG(img, settings) {
    if (!this.enhancedElements.has(img)) {
      this.enhancedElements.set(img, {
        originalFilter: img.style.filter
      });
    }

    const filters = [];

    if (settings.contrastEnabled) {
      const contrastValues = { medium: 1.3, high: 1.6, maximum: 2.0 };
      const contrast = contrastValues[settings.contrastLevel] || 1.6;
      filters.push(`contrast(${contrast})`);
    }

    if (settings.outlineEnabled) {
      // Use drop-shadow to simulate outline for img SVGs
      filters.push(`drop-shadow(0 0 ${settings.outlineWidth}px ${settings.outlineColor})`);
    }

    img.style.filter = filters.join(' ');
    img.classList.add('shiny-enhanced-img');
  }

  /**
   * Enhance SVG in <object> or <embed> tags
   * @param {HTMLObjectElement|HTMLEmbedElement} element - Object/embed element
   * @param {Object} settings - Current settings
   */
  enhanceEmbeddedSVG(element, settings) {
    try {
      // Try to access the SVG document inside
      const svgDoc = element.contentDocument || element.getSVGDocument?.();
      if (svgDoc) {
        const svg = svgDoc.querySelector('svg');
        if (svg) {
          this.enhanceInlineSVG(svg, settings);
          return;
        }
      }
    } catch (e) {
      // Cross-origin restriction - fall back to CSS filter
      console.log('Shiny: Cannot access embedded SVG content, applying CSS filter');
    }

    // Fallback to CSS filters
    this.enhanceImgSVG(element, settings);
  }

  /**
   * Restore an element to its original state
   * @param {Element} element - Element to restore
   */
  restore(element) {
    const stored = this.enhancedElements.get(element);
    if (!stored) return;

    if (element.tagName.toLowerCase() === 'svg') {
      // Restore filter
      element.style.filter = stored.originalFilter || '';

      // Restore shapes
      this.removeOutlines(element, stored);
      this.removeHighlighting(element);
      this.removeFocusIndicators(element);

      element.classList.remove('shiny-enhanced');
    } else {
      // Restore img/object/embed
      element.style.filter = stored.originalFilter || '';
      element.classList.remove('shiny-enhanced-img');
    }

    this.enhancedElements.delete(element);
  }

  /**
   * Restore all enhanced elements
   */
  restoreAll() {
    document.querySelectorAll('.shiny-enhanced, .shiny-enhanced-img').forEach(el => {
      this.restore(el);
    });
  }
}

// Make available globally
window.SVGEnhancer = SVGEnhancer;
