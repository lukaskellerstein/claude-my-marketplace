---
name: update-dependencies
description: Update project dependencies to their latest versions, verify nothing breaks, and report what changed. Use this skill when the user says "update dependencies", "upgrade packages", "latest versions", "update deps", "outdated packages", "bump dependencies", or any variation of wanting to bring project dependencies up to date.
---

# update-dependencies Skill

Detect the project's package manager, check for outdated dependencies, update them to latest versions, and run tests to verify nothing breaks.

---

## Workflow

### Step 1: Detect package manager

Identify the package manager by looking for lock/config files:

| File | Package Manager |
|---|---|
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `pnpm-lock.yaml` | pnpm |
| `bun.lockb` | bun |
| `requirements.txt` / `Pipfile` | pip / pipenv |
| `pyproject.toml` (with `[tool.poetry]`) | poetry |
| `pyproject.toml` (with `[project]`) | pip / uv |
| `go.mod` | go |
| `Cargo.toml` | cargo |
| `Gemfile` | bundler |
| `composer.json` | composer (PHP) |

If multiple ecosystems exist (e.g., a monorepo), handle each separately and report per-ecosystem results.

### Step 2: Check for outdated dependencies

Run the appropriate outdated check command:

```bash
# npm
npm outdated

# yarn
yarn outdated

# pnpm
pnpm outdated

# pip
pip list --outdated

# poetry
poetry show --outdated

# go
go list -u -m all

# cargo
cargo outdated   # requires cargo-outdated installed

# bundler
bundle outdated
```

Present a summary of what's outdated before proceeding:

```
## Outdated Dependencies

| Package | Current | Latest | Type |
|---|---|---|---|
| react | 18.2.0 | 19.1.0 | major |
| typescript | 5.3.3 | 5.7.2 | minor |
| eslint | 8.56.0 | 9.18.0 | major |

- 2 major updates, 1 minor update
```

### Step 3: Ask user how to proceed

Present options:
- **Update all** — update everything to latest
- **Minor/patch only** — skip major version bumps (safer)
- **Select specific packages** — let user pick which to update
- **Skip** — just wanted the report

### Step 4: Perform the update

Based on user's choice, run the appropriate update commands:

```bash
# npm — update all
npm update            # minor/patch only
npx npm-check-updates -u && npm install   # including major

# yarn
yarn upgrade          # minor/patch
yarn upgrade --latest # including major

# pnpm
pnpm update           # minor/patch
pnpm update --latest  # including major

# pip
pip install --upgrade <package1> <package2>

# poetry
poetry update         # within constraints
poetry add <pkg>@latest  # to bump to latest major

# go
go get -u ./...
go mod tidy

# cargo
cargo update
```

### Step 5: Verify the update

After updating, run the project's test suite and build to verify nothing broke:

```bash
# Detect and run tests
# npm/yarn/pnpm: look for "test" script in package.json
npm test

# Also try building if a build script exists
npm run build

# Python
pytest
# or
python -m pytest

# Go
go test ./...
go build ./...

# Rust
cargo test
cargo build
```

### Step 6: Report results

Present a clear summary:

```
## Update Complete

### Updated (5 packages)
- react: 18.2.0 → 19.1.0
- typescript: 5.3.3 → 5.7.2
- eslint: 8.56.0 → 9.18.0
- lodash: 4.17.20 → 4.17.21
- axios: 1.6.0 → 1.7.9

### Tests: PASSED
### Build: PASSED
```

If tests or build fail:
1. Report which tests failed and the error output
2. Identify which dependency update likely caused the failure
3. Offer to revert the problematic update while keeping the others
4. Help fix breaking changes if the user wants to proceed

---

## Important Considerations

- **Lock files**: Always commit updated lock files (`package-lock.json`, `yarn.lock`, etc.) alongside dependency changes.
- **Peer dependencies**: Watch for peer dependency conflicts — report them clearly and suggest resolutions.
- **Breaking changes**: Major version bumps often include breaking changes. When updating major versions, check the package's changelog or migration guide if tests fail.
- **Monorepos**: In monorepos, update from the root and ensure all workspaces are consistent.
- **Security**: Highlight any updates that fix known vulnerabilities (check `npm audit` / `pip-audit` / `cargo audit` if available).

---

## Examples

**User: "update my dependencies"**
1. Detects npm project via `package-lock.json`
2. Runs `npm outdated`, finds 8 outdated packages (3 major, 5 minor/patch)
3. Shows summary table, asks "Update all, minor/patch only, or select specific?"
4. User says "minor/patch only"
5. Runs `npm update`, then `npm test` and `npm run build`
6. Reports: 5 packages updated, tests pass, build succeeds
