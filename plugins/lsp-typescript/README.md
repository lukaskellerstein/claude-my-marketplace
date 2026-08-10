# lsp-typescript

TypeScript/JavaScript code intelligence for Claude Code — go to definition, find
references, hover types — backed by **vtsls**.

```bash
claude --plugin-dir ~/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/lsp-typescript
```

## Opt-in per session, never in settings

This plugin is deliberately **not** in `enabledPlugins` anywhere, and must not be
added there. vtsls is the most expensive server of the set — measured at ~0.85 GB
per instance — and with ~20 Claude Code sessions running concurrently on a 32 GB
machine, enabling it globally would silently multiply that across every session in
every repo.

So a plain `claude` has no LSP at all. A session working on a TypeScript project
asks for it with `--plugin-dir` (above), and the server starts lazily — only once a
matching file is actually touched, and only for that session. Exit the session and
the process goes with it.

One plugin per language is the same idea one level down: a session that loads only
`lsp-python` cannot start vtsls, however many `.ts` files sit in the directory.

## Prerequisite

`vtsls` must resolve from `PATH`. This plugin does not install, bundle, or download
it:

```bash
npm i -g @vtsls/language-server
```

The same binary is shared with Neovim — one install, identical version, shared
read-only memory pages, no version drift. If it is missing the plugin simply fails
soft: the session loads, LSP navigation is unavailable.

## Server

Configured in [`.lsp.json`](.lsp.json) — the plugin-root default location, picked up
automatically, so the manifest carries metadata only.

| | |
|:--|:--|
| Command | `vtsls --stdio` |
| Extensions | `.ts` → typescript, `.tsx` → typescriptreact, `.js` → javascript, `.jsx` → javascriptreact |

## See also

- `lsp-python` — basedpyright, for `.py`/`.pyi`
- `lsp-go` — gopls, for `.go`
- `lsp-bash` — bash-language-server, for `.sh`/`.bash`/`.zsh`
