---
name: gws-cli
description: >
  Paperclip-plugin reference for Google Workspace CLI integration. Documents all
  available GWS tools and hosts the import script. NOT deployed to generated companies —
  agents use the individual GWS skills (gws-gmail, gws-calendar, etc.) instead.
---

# Google Workspace CLI (Plugin Reference)

This skill is a **paperclip-plugin reference only**. It is NOT copied into generated companies. Agents use the individual GWS skills (`gws-gmail`, `gws-calendar`, `persona-exec-assistant`, etc.) which are imported into each company's `skills/` directory via `scripts/import-gws-skills.sh`.

The `gws` CLI is pre-installed in the Paperclip container. It provides access to Google Workspace services: Gmail, Calendar, Drive, Docs, Sheets, Slides, Tasks, Chat, Meet, Forms, People, and Keep.

## Authentication

Authentication is automatic via environment variables:
- `AGENT_EMAIL` — your Google Workspace email address
- `COMPANY_DOMAIN` — your Google Workspace domain
- `GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE` — path to the service account JSON

These are set in your `runtime/settings.json`. You don't need to configure auth manually.

## Available Commands

### Email (Gmail)

| Command | Description |
|---------|-------------|
| `gws gmail list` | List messages in inbox |
| `gws gmail read <messageId>` | Read a message and extract body/headers |
| `gws gmail send --to <email> --subject <subject> --body <body>` | Send an email |
| `gws gmail reply <messageId> --body <body>` | Reply to a message |
| `gws gmail reply-all <messageId> --body <body>` | Reply-all to a message |
| `gws gmail forward <messageId> --to <email>` | Forward a message |
| `gws gmail triage` | Show unread inbox summary |

### Calendar

| Command | Description |
|---------|-------------|
| `gws calendar list` | List calendars |
| `gws calendar events` | List upcoming events |
| `gws calendar agenda` | Show agenda across all calendars |
| `gws calendar insert --summary <title> --start <datetime> --end <datetime>` | Create an event |

### Drive

| Command | Description |
|---------|-------------|
| `gws drive list` | List files and folders |
| `gws drive get <fileId>` | Get file metadata |
| `gws drive upload <path>` | Upload a file |
| `gws drive download <fileId>` | Download a file |
| `gws drive mkdir <name>` | Create a folder |

### Docs

| Command | Description |
|---------|-------------|
| `gws docs get <docId>` | Read a Google Doc |
| `gws docs write <docId> --text <text>` | Append text to a doc |
| `gws docs create --title <title>` | Create a new doc |

### Sheets

| Command | Description |
|---------|-------------|
| `gws sheets get <spreadsheetId> --range <range>` | Read values from a spreadsheet |
| `gws sheets append <spreadsheetId> --range <range> --values <json>` | Append a row |
| `gws sheets create --title <title>` | Create a new spreadsheet |

### Tasks

| Command | Description |
|---------|-------------|
| `gws tasks list` | List task lists |
| `gws tasks get <taskListId>` | List tasks in a list |
| `gws tasks insert <taskListId> --title <title>` | Create a task |

### Meet

| Command | Description |
|---------|-------------|
| `gws meet create` | Create a new meeting |
| `gws meet list` | List conferences |

### Chat

| Command | Description |
|---------|-------------|
| `gws chat spaces` | List Chat spaces |
| `gws chat send <spaceId> --text <text>` | Send a message to a space |

### Other Services

| Command | Description |
|---------|-------------|
| `gws slides ...` | Read and write presentations |
| `gws forms ...` | Read and write Google Forms |
| `gws people ...` | Manage contacts and profiles |
| `gws keep ...` | Manage Google Keep notes |

## Getting Help

Run `gws --help` or `gws <service> --help` for full command documentation.

## GWS Skills

Your company includes detailed per-tool skill docs imported from the Google Workspace CLI:
- `/gws-gmail` — detailed Gmail workflows
- `/gws-calendar` — detailed Calendar workflows
- `/gws-drive` — detailed Drive workflows
- `/persona-exec-assistant` — combined inbox + calendar + tasks persona
- `/persona-project-manager` — project coordination persona
- `/persona-content-creator` — content creation and distribution persona
- `/persona-customer-support` — customer ticket handling persona
- `/gws-workflow-meeting-prep` — prepare for your next meeting
- `/gws-workflow-standup-report` — daily standup summary
- `/gws-workflow-weekly-digest` — weekly summary

Run `/gws-workflow` for the full list of available workflow recipes.
