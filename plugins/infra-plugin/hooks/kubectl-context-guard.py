#!/usr/bin/env python3
"""kubectl context guard — PreToolUse on Bash (infra-plugin).

In a project that pins its kube context in a `.kube-context` file, ask the person before a
Bash command runs `kubectl` without `--context <a pinned name>`. The current context of a
machine is whatever was used last, often a remote cluster with admin rights. A permission
rule cannot say "kubectl without this flag": `Bash(kubectl apply:*)` is a prefix match, so
`kubectl -n web rollout restart …` passes it with no prompt.

No `.kube-context`: the guard says nothing. It looks in the working directory and in every
folder above it, up to the project root (the first folder with `.git`, or
CLAUDE_PROJECT_DIR), and then in CLAUDE_PROJECT_DIR itself.

`.kube-context` holds one context name per line; `#` starts a comment. The first name is the
project's own cluster (its scripts read it). More lines allow more contexts.

What it sees: every simple command in the line (split at `;`, `&&`, `||`, `|`, `&`,
parentheses, backticks and newlines), after leading `NAME=value` words and shell keywords;
`kubectl` behind a wrapper such as `watch` or `xargs`; and the text of `bash -c '…'`,
`eval …` and a quoted `$(…)`. A script that runs kubectl itself is not seen: a project's
scripts pin the context on their own.

What passes: a call whose every `--context` is a pinned name, and the local-only
subcommands in LOCAL_ONLY. A line that names kubectl and cannot be parsed asks: the guard
fails closed. `kubectl … delete` with the right context passes here; a permission rule of
the project decides it.
"""

import json
import os
import re
import shlex
import sys

PIN = ".kube-context"

LOCAL_ONLY = (("kustomize",), ("config", "current-context"), ("config", "get-contexts"))
KEYWORDS = {"if", "then", "elif", "else", "while", "until", "do", "!", "{"}
WRAPPERS = {"sudo", "env", "command", "exec", "time", "nohup", "nice", "timeout", "watch", "xargs", "caffeinate"}
SHELLS = {"bash", "sh", "zsh"}
ASSIGNMENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*=")
SHELL_C = re.compile(r"-[a-z]*c[a-z]*")
SEPARATORS = ";&|()`\n"


def pin_file(cwd):
    """The nearest .kube-context: from cwd up to the project root, then the project root."""
    project = os.environ.get("CLAUDE_PROJECT_DIR") or ""
    project = os.path.abspath(project) if project else ""
    folders = []
    here = os.path.abspath(cwd) if cwd else ""
    while here:
        folders.append(here)
        if here == project or os.path.exists(os.path.join(here, ".git")):
            break
        parent = os.path.dirname(here)
        if parent == here:
            break
        here = parent
    if project and project not in folders:
        folders.append(project)
    for folder in folders:
        path = os.path.join(folder, PIN)
        if os.path.isfile(path):
            return path
    return None


def pinned_names(path):
    """The context names in a .kube-context file, in order."""
    names = []
    with open(path, encoding="utf-8") as lines:
        for line in lines:
            words = line.split("#", 1)[0].split()
            if words:
                names.append(words[0])
    return names


def simple_commands(line):
    """The words of each simple command in a shell line."""
    lex = shlex.shlex(line, posix=True, punctuation_chars=SEPARATORS)
    lex.whitespace = " \t\r"
    lex.whitespace_split = True
    lex.commenters = ""
    words = []
    for token in lex:
        if token and all(c in SEPARATORS for c in token):
            yield words
            words = []
        else:
            words.append(token)
    yield words


def strip_prefix(words):
    """Drop leading `NAME=value` words and shell keywords."""
    i = 0
    while i < len(words) and (ASSIGNMENT.match(words[i]) or words[i] in KEYWORDS):
        i += 1
    return words[i:]


def kubectl_args(words):
    """The arguments of the kubectl call in a simple command, or None."""
    words = strip_prefix(words)
    if not words:
        return None
    head = os.path.basename(words[0])
    if head == "kubectl":
        return words[1:]
    if head in WRAPPERS:
        for i, word in enumerate(words[1:], start=1):
            if os.path.basename(word) == "kubectl":
                return words[i + 1 :]
    return None


def nested(words):
    """Command text inside a simple command: `bash -c '…'`, `eval …`, a quoted `$(…)`."""
    words = strip_prefix(words)
    head = os.path.basename(words[0]) if words else ""
    if head in SHELLS:
        for i, word in enumerate(words[1:-1], start=1):
            if SHELL_C.fullmatch(word):
                yield words[i + 1]
    if head == "eval":
        yield " ".join(words[1:])
    for word in words:
        if "$(" in word or "`" in word:
            yield word


def pinned(args, allowed):
    """True when the call names a context and every context it names is allowed."""
    contexts = [args[i + 1] for i, a in enumerate(args[:-1]) if a == "--context"]
    contexts += [a.split("=", 1)[1] for a in args if a.startswith("--context=")]
    return bool(contexts) and all(c in allowed for c in contexts)


def local_only(args):
    plain = [a for a in args if not a.startswith("-")]
    return any(tuple(plain[: len(sub)]) == sub for sub in LOCAL_ONLY)


def unpinned(line, allowed):
    """The first kubectl call in a shell line that does not pin an allowed context, or None."""
    for words in simple_commands(line):
        args = kubectl_args(words)
        if args is not None and not pinned(args, allowed) and not local_only(args):
            return " ".join(["kubectl", *args])
        for inner in nested(words):
            found = unpinned(inner, allowed)
            if found:
                return found
    return None


def ask(reason):
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "ask",
                    "permissionDecisionReason": reason,
                }
            }
        )
    )


def main():
    try:
        event = json.load(sys.stdin)
        line = (event.get("tool_input") or {}).get("command") or ""
    except Exception:
        return
    if not re.search(r"\bkubectl\b", line):
        return
    path = pin_file(event.get("cwd") or os.getcwd())
    if not path:
        return
    try:
        allowed = pinned_names(path)
    except OSError:
        allowed = []
    if not allowed:
        ask(f"{path} names no kube context, so no kubectl call can be checked against it.")
        return
    try:
        call = unpinned(line, allowed)
    except Exception:  # an open quote, or anything else: the guard fails closed
        call = "a command line this guard cannot parse"
    if call:
        if len(call) > 120:
            call = call[:117] + "..."
        wanted = allowed[0] if len(allowed) == 1 else "one of " + ", ".join(allowed)
        ask(
            f"`{call}` does not name --context {wanted} ({path}). "
            "The current kube context of this machine can be another cluster."
        )


if __name__ == "__main__":
    main()
