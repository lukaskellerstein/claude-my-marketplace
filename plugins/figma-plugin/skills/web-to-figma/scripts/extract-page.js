// === WEB2FIGMA: Page Structure Extractor ===
// Run this via browser_evaluate on the TARGET WEBSITE (not Figma)
// Returns structured JSON of the page's sections with styles, text, and images

(() => {
  const VIEWPORT_WIDTH = 1440;
  const MAX_DEPTH = 6;

  // Get computed style properties we care about
  function getStyles(el) {
    const cs = getComputedStyle(el);
    return {
      // Colors
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      // Typography
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textAlign: cs.textAlign,
      textTransform: cs.textTransform,
      // Layout
      display: cs.display,
      flexDirection: cs.flexDirection,
      justifyContent: cs.justifyContent,
      alignItems: cs.alignItems,
      gap: cs.gap,
      // Spacing
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom,
      // Border
      borderRadius: cs.borderRadius,
      borderWidth: cs.borderWidth,
      borderColor: cs.borderColor,
      borderStyle: cs.borderStyle,
      // Effects
      boxShadow: cs.boxShadow,
      opacity: cs.opacity,
      // Background image
      backgroundImage: cs.backgroundImage,
      backgroundSize: cs.backgroundSize,
      // Sizing
      width: cs.width,
      height: cs.height,
      maxWidth: cs.maxWidth,
      overflow: cs.overflow,
    };
  }

  // Extract image URLs from an element
  function getImages(el) {
    const images = [];
    // img tags
    if (el.tagName === 'IMG' && el.src) {
      images.push({ type: 'img', src: el.currentSrc || el.src, alt: el.alt || '' });
    }
    // picture/source
    if (el.tagName === 'PICTURE') {
      const img = el.querySelector('img');
      if (img) images.push({ type: 'picture', src: img.currentSrc || img.src, alt: img.alt || '' });
    }
    // CSS background-image
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none' && bg.startsWith('url(')) {
      const url = bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
      if (url.startsWith('http') || url.startsWith('data:')) {
        images.push({ type: 'background', src: url });
      }
    }
    // SVG inline
    if (el.tagName === 'SVG' || el.tagName === 'svg') {
      images.push({ type: 'svg', src: el.outerHTML.substring(0, 2000) }); // cap size
    }
    return images;
  }

  // Get text content of an element (direct text only, not children)
  function getDirectText(el) {
    let text = '';
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent.trim();
        if (t) text += (text ? ' ' : '') + t;
      }
    }
    return text;
  }

  // Walk the DOM and extract structure
  function extractNode(el, depth = 0) {
    if (depth > MAX_DEPTH) return null;
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;

    const tag = el.tagName.toLowerCase();
    // Skip invisible/irrelevant elements
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    if (['script', 'style', 'noscript', 'meta', 'link', 'br', 'hr'].includes(tag)) return null;

    const rect = el.getBoundingClientRect();
    // Skip elements fully off-screen or zero-size
    if (rect.width < 1 || rect.height < 1) return null;

    const node = {
      tag,
      role: el.getAttribute('role') || '',
      className: (el.className && typeof el.className === 'string') ? el.className.split(' ').slice(0, 3).join(' ') : '',
      bounds: {
        x: Math.round(rect.x),
        y: Math.round(rect.y + window.scrollY),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      },
      text: getDirectText(el),
      images: getImages(el),
      styles: getStyles(el),
      children: [],
    };

    // Recurse into children
    for (const child of el.children) {
      const extracted = extractNode(child, depth + 1);
      if (extracted) node.children.push(extracted);
    }

    return node;
  }

  // Identify top-level sections (semantic landmarks)
  function identifySections() {
    const sections = [];
    const candidates = document.querySelectorAll(
      'header, nav, main, section, article, aside, footer, ' +
      '[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], ' +
      '.hero, .section, .container > div'
    );

    const seen = new Set();
    for (const el of candidates) {
      // Skip nested sections (only top-level)
      if (seen.has(el) || [...seen].some(s => s.contains(el))) continue;
      seen.add(el);
      const extracted = extractNode(el, 0);
      if (extracted && extracted.bounds.h > 20) {
        sections.push(extracted);
      }
    }

    // If no semantic sections found, fall back to body's direct children
    if (sections.length === 0) {
      for (const child of document.body.children) {
        const extracted = extractNode(child, 0);
        if (extracted && extracted.bounds.h > 20) {
          sections.push(extracted);
        }
      }
    }

    return sections;
  }

  // Extract page-level metadata
  function pageMetadata() {
    const bodyCs = getComputedStyle(document.body);
    return {
      title: document.title,
      url: window.location.href,
      viewportWidth: window.innerWidth,
      pageHeight: document.documentElement.scrollHeight,
      bodyBackground: bodyCs.backgroundColor,
      bodyColor: bodyCs.color,
      bodyFontFamily: bodyCs.fontFamily,
      bodyFontSize: bodyCs.fontSize,
    };
  }

  // Collect all unique image URLs on the page
  function allImageUrls() {
    const urls = new Set();
    document.querySelectorAll('img[src]').forEach(img => {
      const src = img.currentSrc || img.src;
      if (src && src.startsWith('http')) urls.add(src);
    });
    document.querySelectorAll('[style*="background"]').forEach(el => {
      const bg = getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const match = bg.match(/url\(["']?(https?:\/\/[^"')]+)/);
        if (match) urls.add(match[1]);
      }
    });
    return [...urls];
  }

  return {
    metadata: pageMetadata(),
    sections: identifySections(),
    imageUrls: allImageUrls(),
  };
})();
