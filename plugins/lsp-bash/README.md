# lsp-bash

Shell script code intelligence for Claude Code — go to definition, find references,
hover, plus shellcheck diagnostics — backed by **bash-language-server**.

```bash
claude --plugin-dir ~/Projects/Github/lukaskellerstein/claude-my-marketplace/plugins/lsp-bash
```

## Opt-in per session, never in settings

This plugin is deliberately **not** in `enabledPlugins` anywhere, and must not be
added there. A language server costs hundreds of MB of RAM per instance; with ~20
Claude Code sessions running concurrently on a 32 GB machine, enabling it globally
would silently multiply that across every session in every repo.

So a plain `claude` has no LSP at all. A session that wants shell navigation asks for
it with `--plugin-dir` (above), and the server starts lazily — only once a `.sh`,
`.bash` or `.zsh` file is actually touched, and only for that session. Exit the
session and the process goes with it.

One plugin per language is the same idea one level down: loading this plugin cannot
start the Go, Python or TypeScript server, because they are not in it.

## Prerequisite

`bash-language-server` must resolve from `PATH`. This plugin does not install,
bundle, or download it:

```bash
npm install -g bash-language-server     # needs Node.js 20+
```

That is the whole list. `shellcheck` and `shfmt` are separate binaries the server
shells out to, and **every guide tells you to install them — for this plugin, do
not bother.** They feed diagnostics and formatting, and Claude Code's LSP tool has
neither operation ([below](#what-you-actually-get)), so the two binaries change
nothing a Claude session can observe. Install them if another editor shares this
server; skip them otherwise.

If `bash-language-server` itself is missing the plugin fails soft: the session
loads, LSP navigation is unavailable.

## Server

Configured in [`.lsp.json`](.lsp.json) — the plugin-root default location, picked up
automatically, so the manifest carries metadata only.

| | |
|:--|:--|
| Command | `bash-language-server start` |
| Extensions | `.sh`, `.bash`, `.zsh` → shellscript |

## What you actually get

**Five of Claude Code's nine LSP operations, not nine.** Measured from the server's
own `initialize` response (v5.6.0):

| Operation | Backed by | |
|:--|:--|:--|
| `goToDefinition` | `definitionProvider` | ✅ |
| `findReferences` | `referencesProvider` | ✅ |
| `hover` | `hoverProvider` | ✅ |
| `documentSymbol` | `documentSymbolProvider` | ✅ |
| `workspaceSymbol` | `workspaceSymbolProvider` | ✅ |
| `goToImplementation` | — | ❌ |
| `prepareCallHierarchy` / `incomingCalls` / `outgoingCalls` | — | ❌ |

No `implementationProvider` and no `callHierarchyProvider` are advertised, so those
four calls have nothing to answer them — shell has no interfaces, and the server
builds no call graph. Ask for a call hierarchy and you get an empty result, not an
error, which is the failure mode worth knowing about in advance.

What the five that work are worth: Tree-sitter parsing plus background analysis
across `source`d files, so `findReferences` on a function defined in a `lib.sh` and
called from twenty siblings returns the twenty — which is exactly the question grep
answers badly, since a shell function name and its call sites are the identical
string.

**Diagnostics are not on the list.** The server integrates shellcheck, but Claude
Code's LSP tool has no diagnostics operation at all, so none of it is reachable
from Claude — installing `shellcheck` and `shfmt` changes nothing for *this*
plugin. They matter for editors that consume diagnostics over LSP, which is why
they are still listed as prerequisites above. If the goal is catching shell bugs
from Claude Code, run `shellcheck` from Bash or a `PostToolUse` hook; the LSP is
for navigation.

`.zsh` is mapped here for navigation convenience — shellcheck does not lint zsh
either way.

## See also

- `lsp-python` — basedpyright, for `.py`/`.pyi`
- `lsp-typescript` — vtsls, for `.ts`/`.tsx`/`.js`/`.jsx`
- `lsp-go` — gopls, for `.go`
