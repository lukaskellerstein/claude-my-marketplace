# Analysis Checklist — Plugin & Tool Coverage

Quick reference for checking if agents have the right tools for their role.

## Expected Plugin Assignments

| Role | Should have | Why |
|------|------------|-----|
| CEO | dev-tools, office | PR reviews, presentations, documents |
| CTO | dev-tools, office, infra | Engineering leadership + infrastructure |
| CMO | office, media, design | Content creation, presentations, visuals |
| CFO | office | Spreadsheets, financial documents |
| HeadOfOperations | office | Business documents |
| Backend Engineer | dev-tools, infra | Code tools + deployment |
| Frontend Engineer | dev-tools, design, web-design | Code tools + UI/UX |
| ML/AI Engineer | dev-tools | Code tools |
| DevOps Engineer | dev-tools, infra | Code + infrastructure tools |
| QA Engineer | dev-tools | Code analysis + browser testing (Chrome MCP) |
| UX Tester | dev-tools, design, web-design | Testing + design evaluation |
| Designer | media, design | Visual creation + design direction |
| Content Creator | office, media, design | Documents + media generation |
| Product Manager | office | Business documents |
| Researcher | office | Reports and analysis |

## Expected MCP Servers

| Agent type | Should have in mcp.json | Permission needed |
|-----------|------------------------|-------------------|
| Frontend Engineer | Chrome DevTools | `mcp__chrome` |
| QA Engineer | Chrome DevTools | `mcp__chrome` |
| UX Tester | Chrome DevTools | `mcp__chrome` |

## Red Flags

- Engineer without `dev-tools-plugin` — can't use git workflows or code analysis
- Frontend without `design-plugin` — can't follow design system
- CMO without `media-plugin` — can't generate marketing visuals
- CTO without `infra-plugin` — can't manage infrastructure
- Agent with plugins but no matching MCP permissions in settings.json
- Agent with Chrome DevTools MCP but not in their mcp.json
- `web-design-plugin` enabled without `design-plugin` (dependency missing)
- `design-plugin` enabled without `media-plugin` (dependency missing)
