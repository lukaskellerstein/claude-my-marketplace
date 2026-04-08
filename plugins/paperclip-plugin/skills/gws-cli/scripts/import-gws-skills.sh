#!/usr/bin/env bash
# Import Google Workspace CLI skills into a generated company package.
# Run this DURING company generation to populate the company's skills/ directory.
#
# Usage:
#   bash import-gws-skills.sh <company-root>
#
# Example:
#   bash paperclip-plugin/skills/gws-cli/scripts/import-gws-skills.sh /path/to/cellarwood/figurio
#
# What it does:
#   1. Clones the GWS CLI repo (shallow)
#   2. Copies all GWS skill SKILL.md files into <company-root>/skills/
#   3. Cleans up the clone
#
# The gws-cli skill itself is NOT copied — it is a paperclip-plugin reference only.
# Agents list the individual GWS skills (gws-gmail, gws-calendar, etc.) in their frontmatter.

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <company-root>"
  echo "Example: $0 /path/to/cellarwood/figurio"
  exit 1
fi

COMPANY_ROOT="$(cd "$1" && pwd)"
SKILLS_DIR="$COMPANY_ROOT/skills"
TMP_DIR=$(mktemp -d)

echo "Target company: $COMPANY_ROOT"
mkdir -p "$SKILLS_DIR"

echo "Cloning Google Workspace CLI..."
git clone --depth 1 https://github.com/googleworkspace/cli "$TMP_DIR/gws-cli"

GWS_SKILLS_DIR="$TMP_DIR/gws-cli/skills"

if [ ! -d "$GWS_SKILLS_DIR" ]; then
  echo "ERROR: No skills directory found in GWS CLI repo"
  rm -rf "$TMP_DIR"
  exit 1
fi

count=0
for skill_dir in "$GWS_SKILLS_DIR"/*/; do
  skill_name=$(basename "$skill_dir")
  target="$SKILLS_DIR/$skill_name"

  # Skip if company already has a custom skill with the same name
  if [ -d "$target" ]; then
    echo "  SKIP $skill_name (already exists)"
    continue
  fi

  mkdir -p "$target"
  cp -r "$skill_dir"* "$target/"
  echo "  ADD  $skill_name"
  count=$((count + 1))
done

rm -rf "$TMP_DIR"

echo "Done. Imported $count GWS skills into $SKILLS_DIR"
