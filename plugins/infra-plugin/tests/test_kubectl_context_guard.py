"""The PreToolUse hook that asks before a kubectl call without the project's pinned kube context.

Run from the plugin folder, with no install:
    python3 -m unittest discover -s tests -v

Why the hook exists: a permission rule such as `Bash(kubectl apply:*)` is a prefix match, so
`kubectl -n web rollout restart …` ran against the machine's current context, a remote cluster
with admin rights, with no prompt.
"""

import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest

HOOK = pathlib.Path(__file__).resolve().parents[1] / "hooks" / "kubectl-context-guard.py"
CTX = "k3d-myapp"


def run_hook(command, cwd, project=None, stdin=None):
    """The hook's stdout for one Bash command, run as Claude Code runs it."""
    if stdin is None:
        stdin = json.dumps(
            {"hook_event_name": "PreToolUse", "tool_name": "Bash", "cwd": str(cwd), "tool_input": {"command": command}}
        )
    env = {k: v for k, v in os.environ.items() if k != "CLAUDE_PROJECT_DIR"}
    if project is not None:
        env["CLAUDE_PROJECT_DIR"] = str(project)
    done = subprocess.run([sys.executable, str(HOOK)], input=stdin, capture_output=True, text=True, env=env, check=True)
    return done.stdout


def decision(out):
    return json.loads(out)["hookSpecificOutput"]


class Repo(unittest.TestCase):
    """A git repo in a temp folder, with a pin unless a test removes it."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.outside = pathlib.Path(self._tmp.name).resolve()
        self.repo = self.outside / "repo"
        (self.repo / ".git").mkdir(parents=True)
        (self.repo / "k8s" / "local").mkdir(parents=True)
        self.pin = self.repo / ".kube-context"
        self.pin.write_text(f"# the project's own cluster\n{CTX}\n")


class PinnedProject(Repo):
    ASKS = [
        "kubectl get pods",
        "kubectl -n web rollout restart deploy/console",
        "kubectl --context gke-prod apply -k k8s/base",
        f"kubectl --context={CTX} --context gke-prod get pods",
        f"cd k8s && kubectl --context {CTX} get pods && kubectl get ns",
        "KUBECONFIG=~/.kube/other kubectl get pods",
        "/usr/local/bin/kubectl get pods",
        "kubectl config use-context gke-prod",
        "watch -n 5 kubectl get pods",
        "bash -lc 'kubectl get pods'",
        'echo "$(kubectl get pods)"',
        "for ns in a b; do kubectl -n $ns get pods; done",
        "kubectl get pods 'an open quote",
    ]
    PASSES = [
        f"kubectl --context {CTX} -n web get pods",
        f"kubectl --context={CTX} get pods | grep console",
        f"watch kubectl --context {CTX} get pods",
        "kubectl kustomize k8s/local",
        "kubectl config current-context",
        "kubectl config get-contexts",
        "k8s/local/deploy.sh",  # a project script pins the context itself
        "grep -rn kubectl k8s",
        "make test",
    ]

    def test_a_kubectl_call_without_the_pinned_context_asks(self):
        for command in self.ASKS:
            with self.subTest(command=command):
                out = decision(run_hook(command, self.repo))
                self.assertEqual(out["permissionDecision"], "ask")
                self.assertIn(CTX, out["permissionDecisionReason"])

    def test_a_pinned_or_local_only_call_passes_without_a_word(self):
        for command in self.PASSES:
            with self.subTest(command=command):
                self.assertEqual(run_hook(command, self.repo), "")

    def test_the_pin_is_found_from_a_folder_below_it(self):
        out = decision(run_hook("kubectl get pods", self.repo / "k8s" / "local"))
        self.assertEqual(out["permissionDecision"], "ask")
        self.assertIn(str(self.pin), out["permissionDecisionReason"])

    def test_every_name_in_the_pin_is_allowed(self):
        self.pin.write_text(f"{CTX}   # ours\nk3d-shared\n")
        self.assertEqual(run_hook("kubectl --context k3d-shared get pods", self.repo), "")
        self.assertEqual(run_hook(f"kubectl --context {CTX} get pods", self.repo), "")
        out = decision(run_hook("kubectl --context gke-prod get pods", self.repo))
        self.assertIn(f"one of {CTX}, k3d-shared", out["permissionDecisionReason"])

    def test_a_pin_that_names_nothing_asks(self):
        self.pin.write_text("# nothing yet\n\n")
        out = decision(run_hook(f"kubectl --context {CTX} get pods", self.repo))
        self.assertEqual(out["permissionDecision"], "ask")
        self.assertIn("names no kube context", out["permissionDecisionReason"])

    def test_a_long_call_is_cut_in_the_reason(self):
        out = decision(run_hook("kubectl get pods " + "-l app=web " * 30, self.repo))
        self.assertIn("...", out["permissionDecisionReason"])
        self.assertLess(len(out["permissionDecisionReason"]), 400)


class NoPin(Repo):
    def setUp(self):
        super().setUp()
        self.pin.unlink()

    def test_a_project_without_a_pin_is_never_asked(self):
        for command in ("kubectl get pods", "kubectl delete ns web", "watch kubectl get pods"):
            with self.subTest(command=command):
                self.assertEqual(run_hook(command, self.repo), "")

    def test_a_pin_above_the_project_root_is_not_read(self):
        (self.outside / ".kube-context").write_text(f"{CTX}\n")
        self.assertEqual(run_hook("kubectl get pods", self.repo), "")
        self.assertEqual(run_hook("kubectl get pods", self.repo / "k8s"), "")

    def test_the_project_dir_pin_counts_when_the_shell_is_somewhere_else(self):
        self.pin.write_text(f"{CTX}\n")
        elsewhere = self.outside / "elsewhere"
        (elsewhere / ".git").mkdir(parents=True)
        self.assertEqual(run_hook("kubectl get pods", elsewhere), "")
        out = decision(run_hook("kubectl get pods", elsewhere, project=self.repo))
        self.assertEqual(out["permissionDecision"], "ask")

    def test_the_project_dir_ends_the_walk_up(self):
        (self.outside / ".kube-context").write_text(f"{CTX}\n")
        plain = self.outside / "plain" / "sub"  # no .git anywhere below `outside`
        plain.mkdir(parents=True)
        self.assertEqual(run_hook("kubectl get pods", plain, project=self.outside / "plain"), "")
        out = decision(run_hook("kubectl get pods", plain))  # no project root known: the walk reaches the pin
        self.assertEqual(out["permissionDecision"], "ask")


class BadInput(Repo):
    def test_input_that_is_not_json_passes_without_a_word(self):
        self.assertEqual(run_hook("", self.repo, stdin="not json"), "")

    def test_a_tool_call_without_a_command_passes(self):
        stdin = json.dumps({"hook_event_name": "PreToolUse", "tool_name": "Bash", "cwd": str(self.repo), "tool_input": {}})
        self.assertEqual(run_hook("", self.repo, stdin=stdin), "")

    def test_a_missing_cwd_falls_back_to_the_process_folder(self):
        stdin = json.dumps({"hook_event_name": "PreToolUse", "tool_name": "Bash", "tool_input": {"command": "kubectl get pods"}})
        done = subprocess.run(
            [sys.executable, str(HOOK)], input=stdin, capture_output=True, text=True, cwd=self.repo, check=True,
            env={k: v for k, v in os.environ.items() if k != "CLAUDE_PROJECT_DIR"},
        )
        self.assertEqual(decision(done.stdout)["permissionDecision"], "ask")


if __name__ == "__main__":
    unittest.main()
