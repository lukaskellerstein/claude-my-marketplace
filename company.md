# Paperclip Company Plugin

## Overview

I want to create a new paperclip-plugin that will help user / guide user, and create a "company" in paperclip.

## Company Structure

The company will have:
- Name, description, logo, Goals
- Agents, issues

### Agents

Each agent will use primarily Claude Code.

Each agent will have defined:
- `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `HEARTBEAT.md`
- `.mcp.json`, `settings.json`

### Required Software

Each company will have clearly defined software it needs:
- **Slack**
- **Google Workspace** — Email, Calendar, Drive, etc.
- **Payments** — Stripe, Card

### Required Infrastructure

Each company also needs:
- Domain
- Infra — by default k8s, helm, terraform
- GitHub account
- Docker Hub account

### Logistics

- Packaging, sending — Czech = Zásilkovna, World = DHL

## Plugin Concept

The idea is to provide a skill (`/company <description>`), and the agent will guide me through the process, ask me for logins, keys, etc. and all it will need. Eventually it will generate a folder with the name of the company and inside all the predefined structure for agents, goals, etc. including a script. When we run the script, it will create the whole company inside paperclip.

## Source References

- **Source code:** `/home/lukas/Projects/Github/paperclipai/paperclip`
- **Documentation:** `/home/lukas/Projects/Github/paperclipai/paperclip/docs` (including API documentation)
- **Existing skills:** `/home/lukas/Projects/Github/paperclipai/paperclip/.claude/skills` and `/home/lukas/Projects/Github/paperclipai/paperclip/skills`
- **Example folder structure:** `/home/lukas/Projects/Github/paperclipai/paperclip/MY`

## Additional Ideas

- Leverage other existing plugins where they make sense for certain agents
- Offer a `/brainstorming` command for brainstorming ideas
- Come up with the best structure of the plugin that will help users create the best possible "companies" for their ideas