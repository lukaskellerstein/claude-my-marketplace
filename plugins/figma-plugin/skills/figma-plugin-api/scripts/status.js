// Figma Status Panel — inject via mcp__design-playwright__browser_evaluate
// Creates a persistent visual status panel in the Figma file showing:
//   - Plugin version and connection status
//   - Active agents/subagents and their progress
//
// Usage:
//   1. Inject helpers.js first (required)
//   2. Inject this file to create the status panel
//   3. Call __status.agent(id, name, status) to track agents
//   4. Call __status.done(id) when an agent finishes
//   5. Call __status.remove() to clean up when done

const STATUS_VERSION = '1.7.1';
const STATUS_PANEL_NAME = '⚡ Claude Design Status';

window.__status = {
  _agents: {},
  _panelId: null,

  // Create or update the status panel
  _render: async () => {
    // Remove old panel if exists
    const old = figma.currentPage.findOne(n => n.name === STATUS_PANEL_NAME);
    if (old) old.remove();

    // Also check all pages for old panels
    for (const page of figma.root.children) {
      const oldInPage = page.findOne(n => n.name === STATUS_PANEL_NAME);
      if (oldInPage) oldInPage.remove();
    }

    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

    // Panel container
    const panel = figma.createFrame();
    panel.name = STATUS_PANEL_NAME;
    panel.resize(280, 10); // height auto
    panel.layoutMode = 'VERTICAL';
    panel.primaryAxisSizingMode = 'AUTO';
    panel.counterAxisSizingMode = 'FIXED';
    panel.itemSpacing = 0;
    panel.cornerRadius = 12;
    panel.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.12 } }]; // dark bg
    panel.effects = [
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 8 }, radius: 24, visible: true, blendMode: 'NORMAL' },
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 2 }, radius: 6, visible: true, blendMode: 'NORMAL' },
    ];
    panel.clipsContent = true;
    panel.locked = true;

    // Position: top-right of viewport
    const viewport = figma.viewport.bounds;
    panel.x = viewport.x + viewport.width - 300;
    panel.y = viewport.y + 20;

    // ── Header ──
    const header = figma.createFrame();
    header.name = 'Header';
    header.resize(280, 44);
    header.layoutMode = 'HORIZONTAL';
    header.primaryAxisSizingMode = 'FIXED';
    header.counterAxisSizingMode = 'FIXED';
    header.counterAxisAlignItems = 'CENTER';
    header.paddingLeft = 16;
    header.paddingRight = 16;
    header.itemSpacing = 8;
    header.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.18 } }];
    panel.appendChild(header);

    // Status dot (green = connected)
    const dot = figma.createEllipse();
    dot.name = 'StatusDot';
    dot.resize(8, 8);
    dot.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.83, b: 0.6 } }]; // green
    header.appendChild(dot);

    // Title
    const title = figma.createText();
    title.characters = 'Claude Design';
    title.fontSize = 13;
    title.fontName = { family: 'Inter', style: 'Bold' };
    title.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    title.layoutGrow = 1;
    header.appendChild(title);

    // Version badge
    const versionBadge = figma.createFrame();
    versionBadge.name = 'Version';
    versionBadge.layoutMode = 'HORIZONTAL';
    versionBadge.primaryAxisSizingMode = 'AUTO';
    versionBadge.counterAxisSizingMode = 'AUTO';
    versionBadge.paddingLeft = 8;
    versionBadge.paddingRight = 8;
    versionBadge.paddingTop = 2;
    versionBadge.paddingBottom = 2;
    versionBadge.cornerRadius = 4;
    versionBadge.fills = [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96 } }]; // blue
    header.appendChild(versionBadge);

    const versionText = figma.createText();
    versionText.characters = `v${STATUS_VERSION}`;
    versionText.fontSize = 10;
    versionText.fontName = { family: 'Inter', style: 'Bold' };
    versionText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    versionBadge.appendChild(versionText);

    // ── Agents Section ──
    const agents = Object.values(__status._agents);
    const agentCount = agents.length;
    const activeCount = agents.filter(a => a.status !== 'done').length;

    // Agent header
    const agentHeader = figma.createFrame();
    agentHeader.name = 'AgentHeader';
    agentHeader.resize(280, 32);
    agentHeader.layoutMode = 'HORIZONTAL';
    agentHeader.primaryAxisSizingMode = 'FIXED';
    agentHeader.counterAxisSizingMode = 'FIXED';
    agentHeader.counterAxisAlignItems = 'CENTER';
    agentHeader.paddingLeft = 16;
    agentHeader.paddingRight = 16;
    agentHeader.itemSpacing = 6;
    agentHeader.fills = [];
    panel.appendChild(agentHeader);

    const agentLabel = figma.createText();
    agentLabel.characters = 'AGENTS';
    agentLabel.fontSize = 10;
    agentLabel.fontName = { family: 'Inter', style: 'Bold' };
    agentLabel.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.6 } }];
    agentLabel.letterSpacing = { value: 1, unit: 'PIXELS' };
    agentLabel.layoutGrow = 1;
    agentHeader.appendChild(agentLabel);

    // Count badge
    const countBadge = figma.createFrame();
    countBadge.name = 'Count';
    countBadge.layoutMode = 'HORIZONTAL';
    countBadge.primaryAxisSizingMode = 'AUTO';
    countBadge.counterAxisSizingMode = 'AUTO';
    countBadge.paddingLeft = 6;
    countBadge.paddingRight = 6;
    countBadge.paddingTop = 2;
    countBadge.paddingBottom = 2;
    countBadge.cornerRadius = 8;
    countBadge.fills = [{ type: 'SOLID', color: activeCount > 0 ? { r: 0.2, g: 0.83, b: 0.6 } : { r: 0.3, g: 0.3, b: 0.4 } }];
    agentHeader.appendChild(countBadge);

    const countText = figma.createText();
    countText.characters = `${activeCount} active`;
    countText.fontSize = 10;
    countText.fontName = { family: 'Inter', style: 'Medium' };
    countText.fills = [{ type: 'SOLID', color: activeCount > 0 ? { r: 0, g: 0, b: 0 } : { r: 0.7, g: 0.7, b: 0.8 } }];
    countBadge.appendChild(countText);

    // ── Agent Rows ──
    if (agentCount === 0) {
      const emptyRow = figma.createFrame();
      emptyRow.name = 'NoAgents';
      emptyRow.resize(280, 36);
      emptyRow.layoutMode = 'HORIZONTAL';
      emptyRow.primaryAxisSizingMode = 'FIXED';
      emptyRow.counterAxisSizingMode = 'FIXED';
      emptyRow.counterAxisAlignItems = 'CENTER';
      emptyRow.paddingLeft = 16;
      emptyRow.fills = [];
      panel.appendChild(emptyRow);

      const emptyText = figma.createText();
      emptyText.characters = 'No agents running';
      emptyText.fontSize = 12;
      emptyText.fontName = { family: 'Inter', style: 'Regular' };
      emptyText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.5 } }];
      emptyRow.appendChild(emptyText);
    } else {
      for (const agent of agents) {
        const row = figma.createFrame();
        row.name = `Agent_${agent.id}`;
        row.resize(280, 10);
        row.layoutMode = 'HORIZONTAL';
        row.primaryAxisSizingMode = 'FIXED';
        row.counterAxisSizingMode = 'AUTO';
        row.counterAxisAlignItems = 'CENTER';
        row.paddingLeft = 16;
        row.paddingRight = 16;
        row.paddingTop = 6;
        row.paddingBottom = 6;
        row.itemSpacing = 8;
        row.fills = [];
        panel.appendChild(row);

        // Status indicator
        const statusColors = {
          'planning': { r: 0.98, g: 0.73, b: 0.15 },      // yellow
          'fetching-assets': { r: 0.23, g: 0.51, b: 0.96 }, // blue
          'fetching-images': { r: 0.23, g: 0.51, b: 0.96 }, // blue
          'fetching-icons': { r: 0.64, g: 0.51, b: 0.96 },  // purple
          'generating': { r: 0.96, g: 0.51, b: 0.23 },      // orange
          'executing': { r: 0.23, g: 0.51, b: 0.96 },       // blue
          'verifying': { r: 0.64, g: 0.51, b: 0.96 },       // purple
          'done': { r: 0.2, g: 0.83, b: 0.6 },              // green
          'error': { r: 0.94, g: 0.27, b: 0.27 },           // red
        };

        const statusDot = figma.createEllipse();
        statusDot.name = 'StatusDot';
        statusDot.resize(6, 6);
        statusDot.fills = [{ type: 'SOLID', color: statusColors[agent.status] || { r: 0.5, g: 0.5, b: 0.5 } }];
        row.appendChild(statusDot);

        // Agent info
        const info = figma.createFrame();
        info.name = 'Info';
        info.layoutMode = 'VERTICAL';
        info.primaryAxisSizingMode = 'AUTO';
        info.counterAxisSizingMode = 'AUTO';
        info.itemSpacing = 2;
        info.fills = [];
        info.layoutGrow = 1;
        row.appendChild(info);

        const nameText = figma.createText();
        nameText.characters = agent.name;
        nameText.fontSize = 12;
        nameText.fontName = { family: 'Inter', style: 'Medium' };
        nameText.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.95 } }];
        info.appendChild(nameText);

        const statusText = figma.createText();
        statusText.characters = agent.task || agent.status;
        statusText.fontSize = 10;
        statusText.fontName = { family: 'Inter', style: 'Regular' };
        statusText.fills = [{ type: 'SOLID', color: statusColors[agent.status] || { r: 0.5, g: 0.5, b: 0.6 } }];
        info.appendChild(statusText);
      }
    }

    // ── Footer ──
    const footer = figma.createFrame();
    footer.name = 'Footer';
    footer.resize(280, 28);
    footer.layoutMode = 'HORIZONTAL';
    footer.primaryAxisSizingMode = 'FIXED';
    footer.counterAxisSizingMode = 'FIXED';
    footer.counterAxisAlignItems = 'CENTER';
    footer.paddingLeft = 16;
    footer.paddingRight = 16;
    footer.fills = [{ type: 'SOLID', color: { r: 0.06, g: 0.06, b: 0.1 } }];
    panel.appendChild(footer);

    const footerText = figma.createText();
    footerText.characters = `figma-plugin v${STATUS_VERSION} • helpers.js injected`;
    footerText.fontSize = 9;
    footerText.fontName = { family: 'Inter', style: 'Regular' };
    footerText.fills = [{ type: 'SOLID', color: { r: 0.35, g: 0.35, b: 0.45 } }];
    footer.appendChild(footerText);

    figma.currentPage.appendChild(panel);
    __status._panelId = panel.id;

    return `Status panel rendered: ${agentCount} agents (${activeCount} active)`;
  },

  // ── Public API ──

  // Initialize the status panel (call once after helpers.js injection)
  init: async () => {
    __status._agents = {};
    return await __status._render();
  },

  // Register or update an agent
  // Usage: await __status.agent('a1', 'Dashboard Page', 'planning')
  // Status values: planning, fetching-images, fetching-icons, fetching-assets,
  //                generating, executing, verifying, done, error
  agent: async (id, name, status, task) => {
    __status._agents[id] = { id, name, status, task: task || status };
    return await __status._render();
  },

  // Update agent task/status
  update: async (id, status, task) => {
    if (__status._agents[id]) {
      __status._agents[id].status = status;
      if (task) __status._agents[id].task = task;
    }
    return await __status._render();
  },

  // Mark agent as done
  done: async (id) => {
    if (__status._agents[id]) {
      __status._agents[id].status = 'done';
      __status._agents[id].task = 'Completed';
    }
    return await __status._render();
  },

  // Mark agent as error
  error: async (id, message) => {
    if (__status._agents[id]) {
      __status._agents[id].status = 'error';
      __status._agents[id].task = message || 'Error';
    }
    return await __status._render();
  },

  // Remove the status panel (cleanup when done)
  remove: () => {
    for (const page of figma.root.children) {
      const panel = page.findOne(n => n.name === STATUS_PANEL_NAME);
      if (panel) panel.remove();
    }
    __status._agents = {};
    __status._panelId = null;
    return 'Status panel removed';
  },

  // Get current status as data
  info: () => ({
    version: STATUS_VERSION,
    agents: Object.values(__status._agents),
    activeCount: Object.values(__status._agents).filter(a => a.status !== 'done').length,
  }),
};

// Auto-initialize on injection (only on Figma pages)
if (typeof figma !== 'undefined') {
  (async () => { await __status.init(); })();
}

'__status panel injected — v' + STATUS_VERSION
