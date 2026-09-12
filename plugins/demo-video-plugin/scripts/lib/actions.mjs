// The storyboard action runner shared by the script-driven capture paths
// (capture-electron.mjs and capture-attached.mjs). The MCP operator follows the same
// vocabulary by hand; this module is the executable version of it.
//
// Two input modes, chosen by meta.capture.input (per action: `input`):
//   cdp — real input through Playwright (CDP Input.dispatch*). Hover states, focus rings
//         and default key actions all happen. Needs a window that receives input.
//   dom — events dispatched inside the page. Works where CDP input reaches nothing (a
//         window on a hidden macOS desktop, a scriptless iframe), but CSS :hover never
//         triggers and a synthetic key press performs no default action.
//
// In both modes the cursor overlay is driven explicitly (window.__demoCursor), so the
// pointer on camera is the same whichever mode moved the app.
//
// Targets:
//   - a human description ("Search box") — resolved with Playwright's accessible locators,
//     top document only;
//   - `css=<selector>` or any target on an action with `in` — resolved by walking the `in`
//     chain (open shadow roots and same-origin iframes) from inside the page, because
//     Playwright's injected script cannot run in a sandboxed frame with scripting off.

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GLIDE_MS = 520; // pointer travel before a click — long enough to follow
const SETTLE_MS = 280; // pause on the target so the click reads as a decision

// ── In-page helpers (serialised into the page by page.evaluate) ────────────────

/** Walk `scope`, find `selector` (or the smallest element containing `text`). */
function resolveInPage({ scope, selector, text }) {
  let root = document;
  let dx = 0;
  let dy = 0;
  for (const step of scope) {
    const el = root.querySelector(step);
    if (!el) return { error: `scope step "${step}" matched nothing` };
    if (el.tagName === 'IFRAME') {
      let doc = null;
      try {
        doc = el.contentDocument;
      } catch {
        /* cross-origin */
      }
      if (!doc) return { error: `scope step "${step}" is a cross-origin or unloaded iframe` };
      const r = el.getBoundingClientRect();
      dx += r.left + el.clientLeft;
      dy += r.top + el.clientTop;
      window.__demoCursor?.attachFrame?.(el);
      root = doc;
    } else {
      root = el.shadowRoot ?? el;
    }
  }

  let target = null;
  if (selector) {
    target = root.querySelector(selector);
  } else if (text) {
    const walker = (root.ownerDocument ?? root).createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let n = walker.currentNode; n; n = walker.nextNode()) {
      if (n.nodeType === 1 && n.textContent?.includes(text)) target = n; // keeps the deepest
    }
  } else {
    target = root.body ?? root.documentElement ?? root.host ?? null;
  }
  if (!target) return { error: `nothing matched ${selector ? `"${selector}"` : `text "${text}"`}` };

  const r = target.getBoundingClientRect();
  window.__demoTarget = target;
  window.__demoOffset = { dx, dy };
  return {
    x: dx + r.left + r.width / 2,
    y: dy + r.top + r.height / 2,
    width: r.width,
    height: r.height,
    visible: r.width > 0 && r.height > 0,
  };
}

/** Dispatch a full pointer + mouse click sequence on the resolved target. */
function domClickInPage({ double }) {
  const el = window.__demoTarget;
  const view = el.ownerDocument.defaultView;
  const r = el.getBoundingClientRect();
  const base = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view,
    clientX: r.left + r.width / 2,
    clientY: r.top + r.height / 2,
    button: 0,
  };
  const pointer = { ...base, pointerId: 1, pointerType: 'mouse', isPrimary: true };
  const once = (detail) => {
    el.dispatchEvent(new view.PointerEvent('pointerdown', pointer));
    el.dispatchEvent(new view.MouseEvent('mousedown', { ...base, detail }));
    if (typeof el.focus === 'function') el.focus({ preventScroll: true });
    el.dispatchEvent(new view.PointerEvent('pointerup', pointer));
    el.dispatchEvent(new view.MouseEvent('mouseup', { ...base, detail }));
    el.dispatchEvent(new view.MouseEvent('click', { ...base, detail }));
  };
  once(1);
  if (double) {
    once(2);
    el.dispatchEvent(new view.MouseEvent('dblclick', { ...base, detail: 2 }));
  }
}

/** Hover without real input: the JS handlers fire, CSS :hover does not. */
function domHoverInPage() {
  const el = window.__demoTarget;
  const view = el.ownerDocument.defaultView;
  const r = el.getBoundingClientRect();
  const base = { bubbles: true, composed: true, view, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  el.dispatchEvent(new view.PointerEvent('pointerover', { ...base, pointerType: 'mouse' }));
  el.dispatchEvent(new view.MouseEvent('mouseover', base));
  el.dispatchEvent(new view.MouseEvent('mouseenter', { ...base, bubbles: false }));
  el.dispatchEvent(new view.MouseEvent('mousemove', base));
}

/** Insert one character the way an input event would, in the target's own realm. */
function domTypeCharInPage({ ch }) {
  const doc = window.__demoTarget.ownerDocument;
  const view = doc.defaultView;
  const el = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : window.__demoTarget;
  if (el instanceof view.HTMLInputElement || el instanceof view.HTMLTextAreaElement) {
    const proto = el instanceof view.HTMLTextAreaElement ? view.HTMLTextAreaElement : view.HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set;
    setter.call(el, el.value + ch); // the native setter, so React sees a real change
    el.dispatchEvent(new view.InputEvent('input', { bubbles: true, composed: true, data: ch, inputType: 'insertText' }));
  } else {
    doc.execCommand('insertText', false, ch);
  }
}

/** keydown + keyup for "Meta+Enter" style chords on the focused element. */
function domPressInPage({ chord }) {
  const doc = window.__demoTarget?.ownerDocument ?? document;
  const view = doc.defaultView;
  const parts = chord.split('+');
  const key = parts.pop();
  const mods = new Set(parts.map((p) => p.toLowerCase()));
  const init = {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    bubbles: true,
    cancelable: true,
    composed: true,
    metaKey: mods.has('meta') || mods.has('cmd') || mods.has('controlormeta'),
    ctrlKey: mods.has('control') || mods.has('ctrl'),
    altKey: mods.has('alt') || mods.has('option'),
    shiftKey: mods.has('shift'),
  };
  const el = doc.activeElement ?? doc.body;
  el.dispatchEvent(new view.KeyboardEvent('keydown', init));
  el.dispatchEvent(new view.KeyboardEvent('keyup', init));
}

/**
 * Find `text` inside the resolved container, whitespace-insensitive, and return the
 * screen points where a drag over it starts and ends. The Range is kept on window for
 * extendSelectionInPage.
 */
function findTextInPage({ text, occurrence }) {
  const container = window.__demoTarget;
  const doc = container.ownerDocument ?? container;
  const { dx, dy } = window.__demoOffset;
  // Collapse whitespace while remembering where every kept character came from.
  const map = [];
  let hay = '';
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (let i = 0; i < node.data.length; i++) {
      const isSpace = /\s/.test(node.data[i]);
      if (isSpace && (hay.endsWith(' ') || hay === '')) continue;
      hay += isSpace ? ' ' : node.data[i];
      map.push([node, i]);
    }
  }
  const needle = text.replace(/\s+/g, ' ').trim();
  let at = -1;
  for (let k = 0, from = 0; k < occurrence; k++, from = at + 1) {
    at = hay.indexOf(needle, from);
    if (at < 0) break;
  }
  if (at < 0) return { error: `text not found: "${needle.slice(0, 80)}"` };

  const [startNode, startOffset] = map[at];
  const [endNode, endOffset] = map[at + needle.length - 1];
  const range = doc.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset + 1);
  window.__demoSelection = { range, startNode, startOffset, map, from: at, length: needle.length };

  const rects = [...range.getClientRects()].filter((r) => r.width > 0);
  if (!rects.length) return { error: 'the text is not rendered (zero-size range)' };
  const first = rects[0];
  const last = rects[rects.length - 1];
  return {
    start: { x: dx + first.left, y: dy + first.top + first.height / 2 },
    end: { x: dx + last.right, y: dy + last.top + last.height / 2 },
  };
}

/** Grow the kept selection to `fraction` of the text; on 1, fire mouseup like a release. */
function extendSelectionInPage({ fraction, release }) {
  const s = window.__demoSelection;
  const doc = s.startNode.ownerDocument;
  const last = Math.max(0, Math.round(s.length * fraction) - 1);
  const [node, offset] = s.map[s.from + last];
  const range = doc.createRange();
  range.setStart(s.startNode, s.startOffset);
  range.setEnd(node, offset + 1);
  const sel = doc.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  if (release) {
    const view = doc.defaultView;
    const rect = [...range.getClientRects()].pop();
    const target = node.parentElement ?? doc.body;
    target.dispatchEvent(
      new view.MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        composed: true,
        view,
        button: 0,
        clientX: rect ? rect.right : 0,
        clientY: rect ? rect.top + rect.height / 2 : 0,
      })
    );
  }
}

function domScrollInPage({ by }) {
  const el = window.__demoTarget;
  const doc = el.ownerDocument ?? document;
  const scroller = el === doc.body || el === doc.documentElement ? doc.scrollingElement : el;
  scroller.scrollBy({ top: by, behavior: 'instant' });
}

// ── Node-side primitives ───────────────────────────────────────────────────────

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

async function cursorTo(ctx, x, y, ms = GLIDE_MS) {
  await ctx.page.evaluate(([px, py, pms]) => window.__demoCursor?.moveTo(px, py, pms), [x, y, ms]);
  if (ctx.inputFor === 'cdp') await ctx.page.mouse.move(x, y, { steps: 12 });
  await sleep(ms);
}

const cursorClick = (ctx, x, y) =>
  ctx.page.evaluate(([px, py]) => window.__demoCursor?.click(px, py), [x, y]);

/** Badge for a chord the viewer cannot see being pressed. Typing needs none. */
async function cursorKeys(ctx, chord) {
  const parts = chord.split('+').map((p) =>
    ({ meta: '⌘', cmd: '⌘', controlormeta: '⌘', control: 'Ctrl', ctrl: 'Ctrl', alt: '⌥', option: '⌥', shift: '⇧' })[
      p.toLowerCase()
    ] ?? p
  );
  if (parts.length > 1 || chord.length > 1) {
    await ctx.page.evaluate((p) => window.__demoCursor?.keys(p), parts);
  }
}

function locatorsFor(page, target) {
  const t = target.replace(/\s+(button|box|field|input|link|menu|tab)$/i, '').trim();
  return [
    page.getByRole('button', { name: t, exact: false }),
    page.getByRole('link', { name: t, exact: false }),
    page.getByRole('textbox', { name: t, exact: false }),
    page.getByLabel(t, { exact: false }),
    page.getByPlaceholder(t, { exact: false }),
    page.getByTestId(t),
    page.getByText(t, { exact: false }).first(),
    page.locator(target).first(),
  ];
}

async function firstVisibleLocator(page, target, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const candidate of locatorsFor(page, target)) {
      try {
        if (await candidate.isVisible({ timeout: 250 })) return candidate;
      } catch {
        /* next candidate */
      }
    }
    await sleep(150);
  }
  throw new Error(`could not find "${target}" on screen`);
}

const isScoped = (action) => Array.isArray(action.in) || String(action.target ?? '').startsWith('css=');

/**
 * Resolve a target to a screen point. Scoped targets also leave window.__demoTarget set,
 * which every dom-mode primitive acts on.
 */
async function resolve(ctx, action, { timeoutMs = 6000, state = 'visible' } = {}) {
  if (!isScoped(action)) {
    const locator = await firstVisibleLocator(ctx.page, action.target, timeoutMs);
    const box = await locator.boundingBox();
    if (!box) throw new Error(`"${action.target}" has no bounding box (hidden or detached)`);
    await locator.evaluate((el) => {
      window.__demoTarget = el;
      window.__demoOffset = { dx: 0, dy: 0 };
    });
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, locator };
  }
  const raw = String(action.target ?? '');
  const query = {
    scope: action.in ?? [],
    selector: raw.startsWith('text=') ? null : raw.replace(/^css=/, '') || null,
    text: raw.startsWith('text=') ? raw.slice(5) : null,
  };
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await ctx.page.evaluate(resolveInPage, query);
    const found = !last.error && last.visible;
    if (state === 'hidden' ? !found : found) return last;
    await sleep(150);
  }
  if (state === 'hidden') throw new Error(`"${raw}" was still visible after ${timeoutMs / 1000}s`);
  throw new Error(last?.error ?? `"${raw}" never became visible`);
}

// ── Actions ────────────────────────────────────────────────────────────────────

const handlers = {
  async goto(ctx, a) {
    await ctx.page.goto(a.path);
  },

  async click(ctx, a) {
    const p = await resolve(ctx, a);
    await cursorTo(ctx, p.x, p.y);
    await sleep(SETTLE_MS);
    await cursorClick(ctx, p.x, p.y);
    const double = a.kind === 'dblclick';
    if (ctx.inputFor === 'dom') await ctx.page.evaluate(domClickInPage, { double });
    else if (double) await ctx.page.mouse.dblclick(p.x, p.y);
    else await ctx.page.mouse.click(p.x, p.y);
  },

  async hover(ctx, a) {
    const p = await resolve(ctx, a);
    await cursorTo(ctx, p.x, p.y);
    if (ctx.inputFor === 'dom') await ctx.page.evaluate(domHoverInPage);
  },

  async type(ctx, a) {
    await handlers.click(ctx, { ...a, kind: 'click' });
    const cps = a.wps ?? 6; // characters per second — 6 reads as brisk but human
    for (const ch of a.text) {
      if (ctx.inputFor === 'dom') await ctx.page.evaluate(domTypeCharInPage, { ch });
      else await ctx.page.keyboard.type(ch);
      await sleep(1000 / cps);
    }
  },

  async press(ctx, a) {
    const chord = a.key ?? a.to;
    // In dom mode the event goes to the focused element of the last target's document; a
    // target (e.g. "css=body") picks the document, since a key sent inside an iframe
    // never reaches a listener on the top page.
    if (a.target) await resolve(ctx, a);
    await cursorKeys(ctx, chord);
    if (ctx.inputFor === 'dom') await ctx.page.evaluate(domPressInPage, { chord });
    else await ctx.page.keyboard.press(chord);
  },

  async scroll(ctx, a) {
    // Several small steps, not one jump: the motion is the point.
    const total = a.by ?? 400;
    const steps = Math.max(4, Math.min(20, Math.round(Math.abs(total) / 60)));
    let p = null;
    if (a.target) {
      p = await resolve(ctx, a);
      await cursorTo(ctx, p.x, p.y);
    } else if (ctx.inputFor === 'dom') {
      await ctx.page.evaluate(resolveInPage, { scope: a.in ?? [], selector: null, text: null });
    }
    for (let i = 0; i < steps; i++) {
      if (ctx.inputFor === 'dom') await ctx.page.evaluate(domScrollInPage, { by: total / steps });
      else await ctx.page.mouse.wheel(0, total / steps);
      await sleep(1000 / 45);
    }
  },

  async selectText(ctx, a) {
    // Always dom: a real held-button drag hangs Playwright on Electron, and cannot enter a
    // scriptless frame. The Selection API makes the same selection the user would.
    const container = a.target ? a : { ...a, target: 'css=body' };
    await resolve(ctx, container);
    const span = await ctx.page.evaluate(findTextInPage, { text: a.text, occurrence: a.occurrence ?? 1 });
    if (span.error) throw new Error(span.error);
    await cursorTo(ctx, span.start.x, span.start.y);
    await sleep(SETTLE_MS);
    const ms = a.seconds ? a.seconds * 1000 : Math.min(1600, 350 + a.text.length * 12);
    await ctx.page.evaluate(
      ([s, e, dur]) => window.__demoCursor?.drag(s.x, s.y, e.x, e.y, dur),
      [span.start, span.end, ms]
    );
    const steps = 14;
    for (let k = 1; k <= steps; k++) {
      await sleep(ms / steps);
      await ctx.page.evaluate(extendSelectionInPage, { fraction: easeInOut(k / steps), release: k === steps });
    }
  },

  async waitFor(ctx, a) {
    const timeoutMs = (a.idleUpTo ?? 5) * 1000;
    const compress = a.compress === 'pause' && ctx.recorder?.canPause;
    const wait = async () => {
      if (a.target) await resolve(ctx, a, { timeoutMs, state: a.state ?? 'visible' });
      else if (ctx.app) await ctx.page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {});
      else await sleep(timeoutMs);
    };
    if (!compress) return wait();
    // Show the wait starting, cut the middle out of the recording, resume on the result.
    // The wait runs while the pause is confirmed, so a slow confirmation never lengthens it.
    await sleep((a.showSeconds ?? 1) * 1000);
    const waiting = wait();
    waiting.catch(() => {}); // awaited below
    try {
      await ctx.recorder.pause();
      await waiting;
    } finally {
      await ctx.recorder.resume();
    }
  },

  async dwell(_ctx, a) {
    await sleep((a.seconds ?? 1) * 1000);
  },

  async select(ctx, a) {
    if (isScoped(a)) throw new Error('select supports accessible targets only, not css= or `in`');
    const locator = await firstVisibleLocator(ctx.page, a.target, 6000);
    await locator.selectOption(a.to ?? a.text);
  },

  async upload(ctx, a) {
    if (isScoped(a)) throw new Error('upload supports accessible targets only, not css= or `in`');
    const locator = await firstVisibleLocator(ctx.page, a.target, 6000);
    await locator.setInputFiles(ctx.resolvePath(a.path ?? a.text));
  },

  async menu(ctx, a) {
    if (!ctx.app) throw new Error('menu needs meta.capture.driver "launch" — an attached app has no main-process handle');
    const labels = String(a.to ?? a.target).split('>').map((s) => s.trim());
    const ok = await ctx.app.evaluate(async ({ Menu }, wanted) => {
      let items = Menu.getApplicationMenu()?.items ?? [];
      let item = null;
      for (const label of wanted) {
        item = items.find((i) => (i.label || '').replace(/&/g, '').toLowerCase() === label.toLowerCase());
        if (!item) return false;
        items = item.submenu ? item.submenu.items : [];
      }
      item?.click();
      return Boolean(item);
    }, labels);
    if (!ok) throw new Error(`native menu item "${a.to ?? a.target}" not found`);
  },

  async window(ctx, a) {
    if (!ctx.app) throw new Error('window needs meta.capture.driver "launch"');
    const idx = Number(a.to ?? 1);
    const next = ctx.app.windows()[idx] ?? (await ctx.app.waitForEvent('window', { timeout: 5000 }));
    await next.bringToFront?.();
    ctx.page = next;
  },

  async eval(ctx, a) {
    await ctx.page.evaluate(a.text);
  },
};
handlers.dblclick = handlers.click;
handlers.shortcut = handlers.press;

/**
 * Run one storyboard action with its dwell times, and append a log entry whose times are
 * seconds on the recording's own clock (pauses removed), so a click can be found in the
 * clip later.
 */
export async function runAction(ctx, action, index) {
  const handler = handlers[action.kind];
  if (!handler) throw new Error(`unsupported action kind "${action.kind}"`);
  ctx.inputFor = action.input ?? ctx.input ?? 'cdp';

  const dwellBefore = action.dwellBefore ?? 0.5;
  if (dwellBefore) await sleep(dwellBefore * 1000);

  const entry = { i: index, kind: action.kind, target: action.target, t0: ctx.clock() };
  try {
    await handler(ctx, action);
    entry.ok = true;
  } catch (err) {
    entry.ok = false;
    entry.error = err.message;
    throw new Error(`action ${index} (${action.kind}${action.target ? ` "${action.target}"` : ''}): ${err.message}`);
  } finally {
    entry.t1 = ctx.clock();
    ctx.log.push(entry);
  }

  // Let the UI settle so the next cut does not land mid-animation.
  await sleep((action.dwellAfter ?? 0.4) * 1000);
}

/** Inject the cursor overlay into the current document and every later navigation. */
export async function installOverlay(page, source) {
  await page.addInitScript({ content: source }).catch(() => {});
  await page.evaluate(source).catch(() => {});
}
