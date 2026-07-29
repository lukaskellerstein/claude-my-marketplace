// demo-video-plugin — synthetic cursor overlay.
//
// Playwright's video recording captures NO mouse cursor. Without a visible pointer the
// recording looks like an automated test, not a demo: things click themselves.
// This script draws a cursor that eases toward the real pointer position, plus a click
// ripple and a keystroke badge for keyboard shortcuts.
//
// Injected via `--init-script` on the demo-playwright MCP server, so it runs in every
// page/frame before app scripts, and survives navigation.
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

  const tick = () => {
    renderX += (targetX - renderX) * EASE;
    renderY += (targetY - renderY) * EASE;
    if (cursor) {
      cursor.style.transform = `translate(${renderX.toFixed(2)}px, ${renderY.toFixed(2)}px)`;
    }
    requestAnimationFrame(tick);
  };

  addEventListener(
    'mousemove',
    (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    },
    { capture: true, passive: true }
  );

  addEventListener(
    'mousedown',
    (e) => {
      if (!ripples) return;
      const r = document.createElement('div');
      r.className = 'ripple';
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      ripples.appendChild(r);
      setTimeout(() => r.remove(), 600);
      // Snap closer on click so the pointer never lags behind its own ripple.
      renderX = e.clientX - (e.clientX - renderX) * 0.25;
      renderY = e.clientY - (e.clientY - renderY) * 0.25;
    },
    { capture: true, passive: true }
  );

  // Show a badge for shortcuts only (Cmd/Ctrl/Alt/Meta or named keys) — not for typing,
  // which is already visible in the input the demo is filling.
  addEventListener(
    'keydown',
    (e) => {
      if (!keyBadge) return;
      const mods = [];
      if (e.metaKey) mods.push('⌘');
      if (e.ctrlKey) mods.push('Ctrl');
      if (e.altKey) mods.push('⌥');
      if (e.shiftKey && e.key.length > 1) mods.push('⇧');
      const named = e.key.length > 1 ? e.key : null;
      if (!mods.length && !named) return;
      if (named === 'Shift' || named === 'Meta' || named === 'Control' || named === 'Alt') return;

      const parts = [...mods, named || e.key.toUpperCase()];
      keyBadge.innerHTML = parts.map((p) => `<kbd>${p}</kbd>`).join('');
      keyBadge.classList.add('on');
      clearTimeout(keyBadgeTimer);
      keyBadgeTimer = setTimeout(() => keyBadge.classList.remove('on'), 1100);
    },
    { capture: true, passive: true }
  );

  if (document.body) install();
  else addEventListener('DOMContentLoaded', install, { once: true });

  // Re-attach if the app wipes the DOM (SPA hard re-render, hydration mismatch).
  new MutationObserver(() => {
    if (root && !document.documentElement.contains(root)) {
      document.documentElement.appendChild(root);
    }
  }).observe(document.documentElement, { childList: true });

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
