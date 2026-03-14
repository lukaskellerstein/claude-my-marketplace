// Figma Verification Script — inject after helpers to validate design state
// Run via mcp__design-playwright__browser_evaluate to check for common issues.

(function verify() {
  const page = figma.currentPage;
  const allNodes = page.findAll();
  const issues = [];

  // Check for overlapping top-level frames
  const topFrames = page.children.filter(n => n.type === 'FRAME');
  for (let i = 0; i < topFrames.length; i++) {
    for (let j = i + 1; j < topFrames.length; j++) {
      const a = topFrames[i], b = topFrames[j];
      if (a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y) {
        issues.push(`OVERLAP: "${a.name}" and "${b.name}" overlap`);
      }
    }
  }

  // Check for unnamed nodes
  const unnamed = allNodes.filter(n => n.name.startsWith('Frame ') || n.name.startsWith('Rectangle ') || n.name.startsWith('Text '));
  if (unnamed.length > 0) {
    issues.push(`NAMING: ${unnamed.length} nodes have default names (Frame N, Rectangle N, etc.)`);
  }

  // Check for text nodes without loaded fonts (shows as "Missing font")
  const textNodes = page.findAll(n => n.type === 'TEXT');
  const emptyText = textNodes.filter(n => n.characters === '');
  if (emptyText.length > 0) {
    issues.push(`EMPTY_TEXT: ${emptyText.length} text nodes have no content`);
  }

  // Check for very small elements (likely accidental)
  const tiny = allNodes.filter(n => 'width' in n && n.width < 2 && n.height < 2 && n.visible);
  if (tiny.length > 0) {
    issues.push(`TINY: ${tiny.length} nodes are smaller than 2x2px`);
  }

  // Summary
  const stats = {
    totalNodes: allNodes.length,
    frames: page.findAll(n => n.type === 'FRAME').length,
    text: textNodes.length,
    components: page.findAll(n => n.type === 'COMPONENT').length,
    instances: page.findAll(n => n.type === 'INSTANCE').length,
    images: allNodes.filter(n => 'fills' in n && n.fills.some(f => f.type === 'IMAGE')).length,
    vectors: page.findAll(n => n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION').length,
    issues: issues,
  };

  return stats;
})();
