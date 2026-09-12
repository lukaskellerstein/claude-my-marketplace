// demo-video-plugin — synthetic cursor overlay.
//
// Playwright's video recording captures NO mouse cursor, and OBS is told to hide the OS
// cursor because CDP input never moves it. Without a visible pointer the recording looks
// like an automated test, not a demo: things click themselves.
// This script draws a cursor that eases toward the real pointer position, plus a click
// ripple and a keystroke badge for keyboard shortcuts.
//
// Injected via `--init-script` on the demo-playwright MCP server, so it runs in every
// page/frame before app scripts, and survives navigation. The attached and Electron
// capture scripts inject it with page.evaluate.
//
// Two ways to drive it:
//   - real pointer events (the MCP path): it follows mousemove / mousedown / keydown;
//   - window.__demoCursor (the script path): moveTo / click / drag / keys, for pages where
//     real input does not reach the document, or reaches it only inside an iframe.
// The first call to window.__demoCursor switches the overlay to explicit mode for good,
// so the two sources never fight over the pointer.
//
// It also freezes non-deterministic clock output when DEMO_FREEZE_CLOCK is set on the
// window by the capture script (see skills/demo-app-prep).

(() => {
  if (window.__demoCursorInstalled) return;
  window.__demoCursorInstalled = true;

  // Only decorate top-level documents — iframes would each get their own cursor.
  if (window.top !== window.self) return;

  const CURSOR_SIZE = 22;
  const EASE = 0.32; // 0..1 — higher follows the real pointer more tightly

  let root, cursor, ripples, keyBadge;
  let targetX = -100, targetY = -100;
  let renderX = -100, renderY = -100;
  let keyBadgeTimer = null;
  let explicit = false; // set by the first window.__demoCursor call
  let glide = null; // { fromX, fromY, toX, toY, t0, ms } while an explicit move runs

  const install = () => {
    if (!document.body || root) return;

    root = document.createElement('div');
    root.id = '__demo_cursor_root';
    root.setAttribute('data-demo-overlay', 'true');
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
      overflow: 'hidden',
    });

    const shadow = root.attachShadow ? root.attachShadow({ mode: 'open' }) : root;
    const style = document.createElement('style');
    style.textContent = `
      .cursor {
        position: absolute; top: 0; left: 0;
        width: ${CURSOR_SIZE}px; height: ${CURSOR_SIZE}px;
        will-change: transform; pointer-events: none;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,.45));
      }
      .ripple {
        position: absolute; border-radius: 50%;
        width: 14px; height: 14px; margin: -7px 0 0 -7px;
        border: 2px solid rgba(255,255,255,.95);
        background: rgba(255,255,255,.22);
        /* the dark ring keeps the ripple visible on light UIs, where white alone vanishes */
        box-shadow: 0 0 0 1px rgba(0,0,0,.45), inset 0 0 0 1px rgba(0,0,0,.25);
        animation: rip 520ms cubic-bezier(.22,.61,.36,1) forwards;
      }
      @keyframes rip {
        0%   { transform: scale(.35); opacity: 1; }
        100% { transform: scale(3.4);  opacity: 0; }
      }
      .keys {
        position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
        display: flex; gap: 6px; padding: 10px 14px;
        background: rgba(17,17,20,.82); border-radius: 10px;
        backdrop-filter: blur(8px);
        font: 600 15px/1 ui-sans-serif, -apple-system, system-ui, sans-serif;
        color: #fff; opacity: 0; transition: opacity 140ms ease;
      }
      .keys.on { opacity: 1; }
      .keys kbd {
        display: inline-block; padding: 5px 8px; border-radius: 6px;
        background: rgba(255,255,255,.14);
        box-shadow: inset 0 -1px 0 rgba(0,0,0,.35);
        font: inherit;
      }
    `;

    cursor = document.createElement('div');
    cursor.className = 'cursor';
    // macOS-style arrow so it reads as a real pointer at 1600x900.
    cursor.innerHTML = `
      <svg viewBox="0 0 24 24" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}">
        <path d="M5 2.2 L5 18.4 L9.1 14.5 L11.7 21 L14.4 19.9 L11.8 13.4 L17.6 13.2 Z"
              fill="#fff" stroke="#111" stroke-width="1.1" stroke-linejoin="round"/>
      </svg>`;

    ripples = document.createElement('div');
    Object.assign(ripples.style, { position: 'absolute', inset: '0' });

    keyBadge = document.createElement('div');
    keyBadge.className = 'keys';

    shadow.append(style, ripples, cursor, keyBadge);
    document.documentElement.appendChild(root);

    // Hide the real cursor so we never show two pointers in headed mode.
    const hide = document.createElement('style');
    hide.textContent = `*, *::before, *::after { cursor: none !important; }`;
    document.head?.appendChild(hide);

    requestAnimationFrame(tick);
  };

  // easeInOutCubic — a hand accelerates, travels, then settles on the target.
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  const tick = (now) => {
    if (glide) {
      const t = Math.min(1, (now - glide.t0) / glide.ms);
      const k = ease(t);
      renderX = glide.fromX + (glide.toX - glide.fromX) * k;
      renderY = glide.fromY + (glide.toY - glide.fromY) * k;
      if (t >= 1) glide = null;
    } else {
      renderX += (targetX - renderX) * EASE;
      renderY += (targetY - renderY) * EASE;
    }
    if (cursor) {
      cursor.style.transform = `translate(${renderX.toFixed(2)}px, ${renderY.toFixed(2)}px)`;
    }
    requestAnimationFrame(tick);
  };

  const ripple = (x, y) => {
    if (!ripples) return;
    const r = document.createElement('div');
    r.className = 'ripple';
    r.style.left = `${x}px`;
    r.style.top = `${y}px`;
    ripples.appendChild(r);
    setTimeout(() => r.remove(), 600);
    // Snap closer on click so the pointer never lags behind its own ripple.
    renderX = x - (x - renderX) * 0.25;
    renderY = y - (y - renderY) * 0.25;
  };

  const showKeys = (parts) => {
    if (!keyBadge || !parts.length) return;
    keyBadge.innerHTML = parts.map((p) => `<kbd>${p}</kbd>`).join('');
    keyBadge.classList.add('on');
    clearTimeout(keyBadgeTimer);
    keyBadgeTimer = setTimeout(() => keyBadge.classList.remove('on'), 1100);
  };

  // Real pointer events, from this document or from a same-origin iframe (dx/dy is the
  // frame's content-box offset in this document).
  const onMove = (e, dx = 0, dy = 0) => {
    if (explicit) return;
    targetX = e.clientX + dx;
    targetY = e.clientY + dy;
  };
  const onDown = (e, dx = 0, dy = 0) => {
    if (!explicit) ripple(e.clientX + dx, e.clientY + dy);
  };

  addEventListener('mousemove', (e) => onMove(e), { capture: true, passive: true });
  addEventListener('mousedown', (e) => onDown(e), { capture: true, passive: true });

  // Show a badge for shortcuts only (Cmd/Ctrl/Alt/Meta or named keys) — not for typing,
  // which is already visible in the input the demo is filling.
  addEventListener(
    'keydown',
    (e) => {
      if (explicit) return;
      const mods = [];
      if (e.metaKey) mods.push('⌘');
      if (e.ctrlKey) mods.push('Ctrl');
      if (e.altKey) mods.push('⌥');
      if (e.shiftKey && e.key.length > 1) mods.push('⇧');
      const named = e.key.length > 1 ? e.key : null;
      if (!mods.length && !named) return;
      if (named === 'Shift' || named === 'Meta' || named === 'Control' || named === 'Alt') return;
      showKeys([...mods, named || e.key.toUpperCase()]);
    },
    { capture: true, passive: true }
  );

  // Events inside an iframe never reach this window. Listen in the frame and translate.
  // Only same-origin frames can be watched; a cross-origin one throws and is skipped.
  const watchedFrames = new WeakSet();
  const frameOffset = (frame) => {
    const r = frame.getBoundingClientRect();
    return [r.left + frame.clientLeft, r.top + frame.clientTop];
  };
  const attachFrame = (frame) => {
    if (!frame || watchedFrames.has(frame)) return false;
    let win;
    try {
      win = frame.contentWindow;
      void win.document; // throws for a cross-origin frame
    } catch {
      return false;
    }
    if (!win) return false;
    watchedFrames.add(frame);
    const opts = { capture: true, passive: true };
    const bind = (w) => {
      w.addEventListener('mousemove', (e) => onMove(e, ...frameOffset(frame)), opts);
      w.addEventListener('mousedown', (e) => onDown(e, ...frameOffset(frame)), opts);
    };
    bind(win);
    // A navigation inside the frame replaces its window; bind the new one.
    frame.addEventListener('load', () => {
      try {
        bind(frame.contentWindow);
      } catch {
        /* became cross-origin */
      }
    });
    return true;
  };
  const attachFramesIn = (node) => {
    if (node?.querySelectorAll) node.querySelectorAll('iframe').forEach(attachFrame);
  };

  window.__demoCursor = {
    /** Glide to (x, y) in top-document CSS pixels over `ms`. */
    moveTo(x, y, ms = 450) {
      explicit = true;
      targetX = x;
      targetY = y;
      glide = { fromX: renderX, fromY: renderY, toX: x, toY: y, t0: performance.now(), ms: Math.max(1, ms) };
    },
    /** Ripple at (x, y), or at the pointer when omitted. */
    click(x = targetX, y = targetY) {
      explicit = true;
      ripple(x, y);
    },
    /** Press at (x1, y1) and glide to (x2, y2) — what a text selection looks like. */
    drag(x1, y1, x2, y2, ms = 700) {
      explicit = true;
      renderX = x1;
      renderY = y1;
      ripple(x1, y1);
      this.moveTo(x2, y2, ms);
    },
    /** Show the shortcut badge, e.g. keys(['⌘', 'Enter']). */
    keys(parts) {
      explicit = true;
      showKeys(parts);
    },
    /** Watch an iframe the MutationObserver cannot see, e.g. one inside a shadow root. */
    attachFrame,
    get position() {
      return { x: renderX, y: renderY };
    },
  };

  if (document.body) install();
  else addEventListener('DOMContentLoaded', install, { once: true });

  // Re-attach if the app wipes the DOM (SPA hard re-render, hydration mismatch), and watch
  // iframes as they appear in the light DOM.
  new MutationObserver((records) => {
    if (root && !document.documentElement.contains(root)) {
      document.documentElement.appendChild(root);
    }
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.tagName === 'IFRAME') attachFrame(n);
        else attachFramesIn(n);
      });
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  attachFramesIn(document);

  // ── Determinism helpers ────────────────────────────────────────────────────
  // Opt-in: the capture script sets these before navigating.
  window.__demoFreezeClock = (isoString) => {
    const fixed = new Date(isoString).getTime();
    const RealDate = Date;
    // eslint-disable-next-line no-global-assign
    Date = class extends RealDate {
      constructor(...args) {
        return args.length ? new RealDate(...args) : new RealDate(fixed);
      }
      static now() {
        return fixed;
      }
    };
    Date.UTC = RealDate.UTC;
    Date.parse = RealDate.parse;
  };

  window.__demoHideSelectors = (selectors) => {
    const s = document.createElement('style');
    s.textContent = `${selectors.join(',')} { display: none !important; }`;
    document.head?.appendChild(s);
  };
})();
