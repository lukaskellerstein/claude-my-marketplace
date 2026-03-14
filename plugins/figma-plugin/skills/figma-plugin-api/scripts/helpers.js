// Figma Helper Library — inject via mcp__design-playwright__browser_evaluate
// Read this file with the Read tool, then inject the contents into the browser.
//
// Usage:
//   1. Read this file: Read → .../scripts/helpers.js
//   2. Inject: mcp__design-playwright__browser_evaluate → (file contents)
//   3. All subsequent scripts can use __fh.* helpers
//
// This cuts script length by ~60% and standardizes all Figma operations.

window.__fh = {
  // ═══════════════════════════════════════════════════════════════════
  // NODE CREATION
  // ═══════════════════════════════════════════════════════════════════

  // Apply common node options (shared across frame, rect, comp, etc.)
  _applyCommon: (node, opts) => {
    if (opts.radius) node.cornerRadius = opts.radius;
    if (opts.radiusTL !== undefined) { node.topLeftRadius = opts.radiusTL; }
    if (opts.radiusTR !== undefined) { node.topRightRadius = opts.radiusTR; }
    if (opts.radiusBL !== undefined) { node.bottomLeftRadius = opts.radiusBL; }
    if (opts.radiusBR !== undefined) { node.bottomRightRadius = opts.radiusBR; }
    if (opts.opacity !== undefined) node.opacity = opts.opacity;
    if (opts.rotation !== undefined) node.rotation = opts.rotation;
    if (opts.blendMode) node.blendMode = opts.blendMode;
    if (opts.effects) node.effects = opts.effects;
    if (opts.strokes) node.strokes = opts.strokes;
    if (opts.strokeWeight) node.strokeWeight = opts.strokeWeight;
    if (opts.strokeAlign) node.strokeAlign = opts.strokeAlign;
    if (opts.dash) node.dashPattern = opts.dash;
    if (opts.strokeCap) node.strokeCap = opts.strokeCap;
    if (opts.strokeJoin) node.strokeJoin = opts.strokeJoin;
    if (opts.layoutGrow !== undefined) node.layoutGrow = opts.layoutGrow;
    if (opts.layoutAlign) node.layoutAlign = opts.layoutAlign;
    if (opts.absolute) {
      node.layoutPositioning = 'ABSOLUTE';
      if (opts.constraints) node.constraints = opts.constraints;
      if (opts.x !== undefined) node.x = opts.x;
      if (opts.y !== undefined) node.y = opts.y;
    }
  },

  // Create a frame (auto-layout container)
  // Usage: __fh.frame('Card', { w: 320, h: 200, direction: 'VERTICAL', p: 16, gap: 12, fill: __fh.hex('#FFF'), radius: 12 })
  frame: (name, opts = {}) => {
    const f = figma.createFrame();
    f.name = name;
    f.resize(opts.w || 1440, opts.h || 900);
    if (opts.fill) f.fills = [{ type: 'SOLID', color: opts.fill }];
    if (opts.gradient) f.fills = [opts.gradient];
    if (opts.image) f.fills = [{ type: 'IMAGE', imageHash: opts.image, scaleMode: opts.scaleMode || 'FILL' }];
    if (opts.clip) f.clipsContent = true;
    if (opts.autoLayout || opts.direction) {
      f.layoutMode = opts.direction || 'VERTICAL';
      f.primaryAxisSizingMode = opts.mainSize || 'AUTO';
      f.counterAxisSizingMode = opts.crossSize || 'FIXED';
      f.itemSpacing = opts.gap || 0;
      f.paddingTop = opts.pt || opts.py || opts.p || 0;
      f.paddingBottom = opts.pb || opts.py || opts.p || 0;
      f.paddingLeft = opts.pl || opts.px || opts.p || 0;
      f.paddingRight = opts.pr || opts.px || opts.p || 0;
      if (opts.mainAlign) f.primaryAxisAlignItems = opts.mainAlign;
      if (opts.crossAlign) f.counterAxisAlignItems = opts.crossAlign;
      if (opts.wrap) f.layoutWrap = 'WRAP';
    }
    __fh._applyCommon(f, opts);
    if (opts.parent) opts.parent.appendChild(f);
    else figma.currentPage.appendChild(f);
    return f;
  },

  // Create a Figma Component (reusable)
  comp: (name, opts = {}) => {
    const c = figma.createComponent();
    c.name = name;
    c.resize(opts.w || 100, opts.h || 100);
    if (opts.fill) c.fills = [{ type: 'SOLID', color: opts.fill }];
    if (opts.gradient) c.fills = [opts.gradient];
    if (opts.image) c.fills = [{ type: 'IMAGE', imageHash: opts.image, scaleMode: opts.scaleMode || 'FILL' }];
    if (opts.clip) c.clipsContent = true;
    if (opts.direction) {
      c.layoutMode = opts.direction;
      c.primaryAxisSizingMode = opts.mainSize || 'AUTO';
      c.counterAxisSizingMode = opts.crossSize || 'AUTO';
      c.itemSpacing = opts.gap || 0;
      c.paddingTop = opts.pt || opts.py || opts.p || 0;
      c.paddingBottom = opts.pb || opts.py || opts.p || 0;
      c.paddingLeft = opts.pl || opts.px || opts.p || 0;
      c.paddingRight = opts.pr || opts.px || opts.p || 0;
      if (opts.mainAlign) c.primaryAxisAlignItems = opts.mainAlign;
      if (opts.crossAlign) c.counterAxisAlignItems = opts.crossAlign;
      if (opts.wrap) c.layoutWrap = 'WRAP';
    }
    __fh._applyCommon(c, opts);
    if (opts.parent) opts.parent.appendChild(c);
    else figma.currentPage.appendChild(c);
    return c;
  },

  // Create text node
  // Usage: await __fh.txt('Hello', { size: 24, style: 'Bold', fill: __fh.hex('#000'), parent: frame })
  txt: async (content, opts = {}) => {
    const t = figma.createText();
    const family = opts.font || 'Inter';
    const style = opts.style || 'Regular';
    await figma.loadFontAsync({ family, style });
    t.characters = content;
    t.fontSize = opts.size || 16;
    t.fontName = { family, style };
    if (opts.name) t.name = opts.name;
    if (opts.fill) t.fills = [{ type: 'SOLID', color: opts.fill }];
    if (opts.align) t.textAlignHorizontal = opts.align;
    if (opts.valign) t.textAlignVertical = opts.valign;
    if (opts.lineHeight) t.lineHeight = { value: opts.lineHeight, unit: 'PIXELS' };
    if (opts.letterSpacing) t.letterSpacing = { value: opts.letterSpacing, unit: 'PIXELS' };
    if (opts.decoration) t.textDecoration = opts.decoration;
    if (opts.textCase) t.textCase = opts.textCase;
    if (opts.w) t.resize(opts.w, t.height);
    if (opts.truncation) t.textTruncation = 'ENDING';
    if (opts.maxLines) t.maxLines = opts.maxLines;
    if (opts.opacity !== undefined) t.opacity = opts.opacity;
    if (opts.rotation !== undefined) t.rotation = opts.rotation;
    if (opts.layoutGrow !== undefined) t.layoutGrow = opts.layoutGrow;
    if (opts.layoutAlign) t.layoutAlign = opts.layoutAlign;
    if (opts.autoResize) t.textAutoResize = opts.autoResize;
    if (opts.absolute) {
      t.layoutPositioning = 'ABSOLUTE';
      if (opts.constraints) t.constraints = opts.constraints;
      if (opts.x !== undefined) t.x = opts.x;
      if (opts.y !== undefined) t.y = opts.y;
    }
    if (opts.parent) opts.parent.appendChild(t);
    return t;
  },

  // Rich text — mixed styles in one text node
  // Usage: await __fh.richTxt([
  //   { text: 'Bold text', style: 'Bold', size: 18, hex: '#000' },
  //   { text: ' regular text', size: 18 },
  //   { text: ' colored', hex: '#3B82F6', style: 'Semi Bold' }
  // ], { parent: frame })
  richTxt: async (segments, opts = {}) => {
    const t = figma.createText();
    const defaultFamily = opts.font || 'Inter';
    // Load all needed fonts
    const fontsToLoad = new Set();
    fontsToLoad.add(JSON.stringify({ family: defaultFamily, style: 'Regular' }));
    for (const seg of segments) {
      fontsToLoad.add(JSON.stringify({ family: seg.font || defaultFamily, style: seg.style || 'Regular' }));
    }
    for (const f of fontsToLoad) {
      await figma.loadFontAsync(JSON.parse(f));
    }
    // Set full text content
    t.characters = segments.map(s => s.text).join('');
    // Apply per-segment styles
    let offset = 0;
    for (const seg of segments) {
      const start = offset;
      const end = offset + seg.text.length;
      if (seg.size) t.setRangeFontSize(start, end, seg.size);
      if (seg.style || seg.font) {
        t.setRangeFontName(start, end, { family: seg.font || defaultFamily, style: seg.style || 'Regular' });
      }
      if (seg.hex) {
        t.setRangeFills(start, end, [{ type: 'SOLID', color: __fh.hex(seg.hex) }]);
      }
      if (seg.fill) {
        t.setRangeFills(start, end, [{ type: 'SOLID', color: seg.fill }]);
      }
      if (seg.decoration) t.setRangeTextDecoration(start, end, seg.decoration);
      if (seg.textCase) t.setRangeTextCase(start, end, seg.textCase);
      if (seg.lineHeight) t.setRangeLineHeight(start, end, { value: seg.lineHeight, unit: 'PIXELS' });
      if (seg.letterSpacing) t.setRangeLetterSpacing(start, end, { value: seg.letterSpacing, unit: 'PIXELS' });
      offset = end;
    }
    if (opts.name) t.name = opts.name;
    if (opts.align) t.textAlignHorizontal = opts.align;
    if (opts.valign) t.textAlignVertical = opts.valign;
    if (opts.w) t.resize(opts.w, t.height);
    if (opts.autoResize) t.textAutoResize = opts.autoResize;
    if (opts.layoutGrow !== undefined) t.layoutGrow = opts.layoutGrow;
    if (opts.layoutAlign) t.layoutAlign = opts.layoutAlign;
    if (opts.parent) opts.parent.appendChild(t);
    return t;
  },

  // Create rectangle
  rect: (opts = {}) => {
    const r = figma.createRectangle();
    r.name = opts.name || 'Rectangle';
    r.resize(opts.w || 100, opts.h || 100);
    if (opts.fill) r.fills = [{ type: 'SOLID', color: opts.fill }];
    if (opts.gradient) r.fills = [opts.gradient];
    if (opts.image) r.fills = [{ type: 'IMAGE', imageHash: opts.image, scaleMode: opts.scaleMode || 'FILL' }];
    __fh._applyCommon(r, opts);
    if (opts.parent) opts.parent.appendChild(r);
    return r;
  },

  // Create ellipse / circle
  circle: (opts = {}) => {
    const e = figma.createEllipse();
    e.name = opts.name || 'Ellipse';
    const size = opts.size || opts.w || 100;
    e.resize(size, opts.h || size);
    if (opts.fill) e.fills = [{ type: 'SOLID', color: opts.fill }];
    if (opts.image) e.fills = [{ type: 'IMAGE', imageHash: opts.image, scaleMode: opts.scaleMode || 'FILL' }];
    __fh._applyCommon(e, opts);
    if (opts.parent) opts.parent.appendChild(e);
    return e;
  },

  // Create line
  line: (opts = {}) => {
    const l = figma.createLine();
    l.name = opts.name || 'Line';
    l.resize(opts.w || 100, 0);
    l.strokes = [{ type: 'SOLID', color: opts.color || { r: 0.9, g: 0.9, b: 0.9 } }];
    l.strokeWeight = opts.weight || 1;
    if (opts.dash) l.dashPattern = opts.dash;
    if (opts.strokeCap) l.strokeCap = opts.strokeCap;
    if (opts.strokeJoin) l.strokeJoin = opts.strokeJoin;
    if (opts.opacity !== undefined) l.opacity = opts.opacity;
    if (opts.absolute) {
      l.layoutPositioning = 'ABSOLUTE';
      if (opts.constraints) l.constraints = opts.constraints;
      if (opts.x !== undefined) l.x = opts.x;
      if (opts.y !== undefined) l.y = opts.y;
    }
    if (opts.parent) opts.parent.appendChild(l);
    return l;
  },

  // Create polygon
  // Usage: __fh.polygon({ sides: 6, size: 80, fill: __fh.hex('#F00'), parent: frame })
  polygon: (opts = {}) => {
    const p = figma.createPolygon();
    p.name = opts.name || 'Polygon';
    const size = opts.size || 100;
    p.resize(size, size);
    if (opts.sides) p.pointCount = opts.sides;
    if (opts.fill) p.fills = [{ type: 'SOLID', color: opts.fill }];
    __fh._applyCommon(p, opts);
    if (opts.parent) opts.parent.appendChild(p);
    return p;
  },

  // Create star
  // Usage: __fh.star({ points: 5, size: 48, innerRadius: 0.4, fill: __fh.hex('#FFD700'), parent: frame })
  star: (opts = {}) => {
    const s = figma.createStar();
    s.name = opts.name || 'Star';
    const size = opts.size || 100;
    s.resize(size, size);
    if (opts.points) s.pointCount = opts.points;
    if (opts.innerRadius !== undefined) s.innerRadius = opts.innerRadius;
    if (opts.fill) s.fills = [{ type: 'SOLID', color: opts.fill }];
    __fh._applyCommon(s, opts);
    if (opts.parent) opts.parent.appendChild(s);
    return s;
  },

  // ═══════════════════════════════════════════════════════════════════
  // ICONS (always use this, never draw manually)
  // ═══════════════════════════════════════════════════════════════════

  // Insert SVG icon string into Figma
  // Usage: __fh.icon(svgString, { name: 'Icon/Search', size: 24, parent: frame })
  icon: (svgString, opts = {}) => {
    const node = figma.createNodeFromSvg(svgString);
    node.name = opts.name || 'Icon';
    node.resize(opts.size || 24, opts.size || 24);
    if (opts.parent) opts.parent.appendChild(node);
    return node;
  },

  // Recolor an SVG icon node (recursive)
  recolor: (node, color) => {
    if ('strokes' in node && node.strokes.length > 0) {
      node.strokes = [{ type: 'SOLID', color }];
    }
    if ('fills' in node && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
      node.fills = [{ type: 'SOLID', color }];
    }
    if ('children' in node) {
      node.children.forEach(child => __fh.recolor(child, color));
    }
    return node;
  },

  // ═══════════════════════════════════════════════════════════════════
  // IMAGES (insert generated/downloaded images)
  // ═══════════════════════════════════════════════════════════════════

  // Load image from URL and return image hash for fills
  // Usage: const hash = await __fh.loadImage('https://images.unsplash.com/...');
  //        frame.fills = [{ type: 'IMAGE', imageHash: hash, scaleMode: 'FILL' }];
  loadImage: async (url) => {
    const image = await figma.createImageAsync(url);
    return image.hash;
  },

  // Create a frame with an image fill from URL
  // Usage: await __fh.imageFrame('Hero', { url: '...', w: 1440, h: 400, parent: container })
  imageFrame: async (name, opts = {}) => {
    const f = __fh.frame(name, { ...opts, parent: opts.parent });
    try {
      const image = await figma.createImageAsync(opts.url);
      f.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: opts.scaleMode || 'FILL' }];
    } catch (e) {
      // Fallback to gradient if image load fails
      f.fills = [{
        type: 'GRADIENT_LINEAR',
        gradientStops: [
          { position: 0, color: { r: 0.1, g: 0.1, b: 0.3, a: 1 } },
          { position: 1, color: { r: 0.2, g: 0.3, b: 0.6, a: 1 } }
        ],
        gradientTransform: [[1, 0, 0], [0, 1, 0]]
      }];
    }
    return f;
  },

  // ═══════════════════════════════════════════════════════════════════
  // COLORS & EFFECTS
  // ═══════════════════════════════════════════════════════════════════

  // RGB shorthand (accepts 0-255, converts to Figma 0-1 range)
  rgb: (r, g, b) => ({ r: r / 255, g: g / 255, b: b / 255 }),

  // RGBA for colors with alpha
  rgba: (r, g, b, a) => ({ r: r / 255, g: g / 255, b: b / 255, a }),

  // Hex to Figma color
  hex: (h) => ({
    r: parseInt(h.slice(1, 3), 16) / 255,
    g: parseInt(h.slice(3, 5), 16) / 255,
    b: parseInt(h.slice(5, 7), 16) / 255,
  }),

  // Linear gradient (2-stop)
  // Usage: __fh.gradient('#1E3A8A', '#3B82F6') or __fh.gradient('#000', '#FFF', 'horizontal')
  gradient: (hex1, hex2, direction) => {
    const c1 = __fh.hex(hex1);
    const c2 = __fh.hex(hex2);
    const isHoriz = direction === 'horizontal';
    return {
      type: 'GRADIENT_LINEAR',
      gradientStops: [
        { position: 0, color: { ...c1, a: 1 } },
        { position: 1, color: { ...c2, a: 1 } },
      ],
      gradientTransform: isHoriz ? [[1, 0, 0], [0, 1, 0]] : [[0, 1, 0], [-1, 0, 1]],
    };
  },

  // Multi-stop linear gradient
  // Usage: __fh.gradientMulti([{pos:0, hex:'#000'}, {pos:0.5, hex:'#F00'}, {pos:1, hex:'#FFF'}], 'horizontal')
  gradientMulti: (stops, direction) => {
    const isHoriz = direction === 'horizontal';
    return {
      type: 'GRADIENT_LINEAR',
      gradientStops: stops.map(s => {
        const c = __fh.hex(s.hex);
        return { position: s.pos, color: { ...c, a: s.a !== undefined ? s.a : 1 } };
      }),
      gradientTransform: isHoriz ? [[1, 0, 0], [0, 1, 0]] : [[0, 1, 0], [-1, 0, 1]],
    };
  },

  // Radial gradient
  // Usage: __fh.gradientRadial([{pos:0, hex:'#FFF'}, {pos:1, hex:'#000'}])
  gradientRadial: (stops) => ({
    type: 'GRADIENT_RADIAL',
    gradientStops: stops.map(s => {
      const c = __fh.hex(s.hex);
      return { position: s.pos, color: { ...c, a: s.a !== undefined ? s.a : 1 } };
    }),
    gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
  }),

  // Angular gradient
  // Usage: __fh.gradientAngular([{pos:0, hex:'#F00'}, {pos:0.33, hex:'#0F0'}, {pos:0.66, hex:'#00F'}, {pos:1, hex:'#F00'}])
  gradientAngular: (stops) => ({
    type: 'GRADIENT_ANGULAR',
    gradientStops: stops.map(s => {
      const c = __fh.hex(s.hex);
      return { position: s.pos, color: { ...c, a: s.a !== undefined ? s.a : 1 } };
    }),
    gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
  }),

  // Drop shadow shorthand
  shadow: (x, y, radius, opacity) => [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: opacity || 0.1 },
    offset: { x: x || 0, y: y || 2 },
    radius: radius || 8,
    visible: true,
    blendMode: 'NORMAL',
  }],

  // Multiple shadows (e.g., for elevated cards)
  shadowMd: () => [
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 6, visible: true, blendMode: 'NORMAL' },
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 2 }, radius: 4, visible: true, blendMode: 'NORMAL' },
  ],

  shadowLg: () => [
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 10 }, radius: 15, visible: true, blendMode: 'NORMAL' },
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 4 }, radius: 6, visible: true, blendMode: 'NORMAL' },
  ],

  // Inner shadow
  // Usage: __fh.innerShadow(0, 2, 8, 0.1)
  innerShadow: (x, y, radius, opacity) => [{
    type: 'INNER_SHADOW',
    color: { r: 0, g: 0, b: 0, a: opacity || 0.1 },
    offset: { x: x || 0, y: y || 2 },
    radius: radius || 8,
    visible: true,
    blendMode: 'NORMAL',
  }],

  // Layer blur
  // Usage: frame.effects = __fh.blur(10)
  blur: (radius) => [{ type: 'LAYER_BLUR', radius, visible: true }],

  // Background blur (glassmorphism)
  // Usage: frame.effects = __fh.bgBlur(20)
  bgBlur: (radius) => [{ type: 'BACKGROUND_BLUR', radius, visible: true }],

  // ═══════════════════════════════════════════════════════════════════
  // STYLES (Figma Paint, Text, Effect Styles)
  // ═══════════════════════════════════════════════════════════════════

  // Create a paint style
  paintStyle: (name, color) => {
    const s = figma.createPaintStyle();
    s.name = name;
    s.paints = [{ type: 'SOLID', color }];
    return s;
  },

  // Create a text style
  textStyle: async (name, opts = {}) => {
    const s = figma.createTextStyle();
    s.name = name;
    const family = opts.font || 'Inter';
    const style = opts.style || 'Regular';
    await figma.loadFontAsync({ family, style });
    s.fontName = { family, style };
    s.fontSize = opts.size || 16;
    if (opts.lineHeight) s.lineHeight = { value: opts.lineHeight, unit: 'PIXELS' };
    if (opts.letterSpacing) s.letterSpacing = { value: opts.letterSpacing, unit: 'PIXELS' };
    return s;
  },

  // Create an effect style (shadow)
  effectStyle: (name, effects) => {
    const s = figma.createEffectStyle();
    s.name = name;
    s.effects = effects;
    return s;
  },

  // ═══════════════════════════════════════════════════════════════════
  // NAVIGATION & LOOKUP
  // ═══════════════════════════════════════════════════════════════════

  // Find node by name in current page
  find: (name) => figma.currentPage.findOne(n => n.name === name),

  // Find all nodes by name pattern
  findAll: (pattern) => figma.currentPage.findAll(n => n.name.includes(pattern)),

  // Find by type
  findType: (type) => figma.currentPage.findAll(n => n.type === type),

  // Switch page by name (create if missing)
  page: (name) => {
    let p = figma.root.children.find(c => c.name === name);
    if (!p) { p = figma.createPage(); p.name = name; }
    figma.currentPage = p;
    return p;
  },

  // Zoom viewport to show nodes
  zoomTo: (nodes) => {
    const arr = Array.isArray(nodes) ? nodes : [nodes];
    figma.viewport.scrollAndZoomIntoView(arr);
  },

  // Select nodes
  select: (nodes) => {
    figma.currentPage.selection = Array.isArray(nodes) ? nodes : [nodes];
  },

  // ═══════════════════════════════════════════════════════════════════
  // FONTS
  // ═══════════════════════════════════════════════════════════════════

  // Batch load fonts
  // Usage: await __fh.fonts(['Inter','Regular'], ['Inter','Bold'], ['Inter','Semi Bold'])
  fonts: async (...styles) => {
    for (const s of styles) {
      await figma.loadFontAsync({ family: s[0] || 'Inter', style: s[1] || 'Regular' });
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════════

  // Notify user in Figma UI
  notify: (msg) => figma.notify(msg),

  // Group nodes
  group: (nodes, parent) => figma.group(nodes, parent || figma.currentPage),

  // Flatten nodes (for SVG cleanup)
  flatten: (nodes) => figma.flatten(nodes),
};

'__fh helpers injected — ready'
