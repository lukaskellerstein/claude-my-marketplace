# lsp-go

Go code intelligence for Claude Code — go to definition, find references, hover
types — backed by **gopls**.

```bash
claude --plugin-dir ~/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/lsp-go
```

## Opt-in per session, never in settings

This plugin is deliberately **not** in `enabledPlugins` anywhere, and must not be
added there. A language server costs hundreds of MB of RAM per instance; with ~20
Claude Code sessions running concurrently on a 32 GB machine, enabling it globally
would silently multiply that across every session in every repo.

So a plain `claude` has no LSP at all. A session that wants Go navigation asks for
it with `--plugin-dir` (above), and the server starts lazily — only once a `.go`
file is actually touched, and only for that session. Exit the session and the
process goes with it.

One plugin per language is the same idea one level down: loading this plugin cannot
start the Python or TypeScript server, because they are not in it.

## Prerequisite

`gopls` must resolve from `PATH`. This plugin does not install, bundle, or download
it:

```bash
brew install go                                # if Go is not installed yet
go install golang.org/x/tools/gopls@latest     # installs to $(go env GOPATH)/bin
```

Make sure `$(go env GOPATH)/bin` (default `~/go/bin`) is on `PATH`. The same binary
is shared with Neovim — one install, identical version, shared read-only memory
pages, no version drift. If it is missing the plugin simply fails soft: the session
loads, LSP navigation is unavailable.

## Server

Configured in [`.lsp.json`](.lsp.json) — the plugin-root default location, picked up
automatically, so the manifest carries metadata only.

| | |
|:--|:--|
| Command | `gopls` (no args — gopls defaults to stdio) |
| Extensions | `.go` |

## See also

- `lsp-python` — basedpyright, for `.py`/`.pyi`
- `lsp-typescript` — vtsls, for `.ts`/`.tsx`/`.js`/`.jsx`
