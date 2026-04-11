#!/usr/bin/env bash
# =============================================================================
# Work Plan Generator for Paperclip Company Packages
# =============================================================================
# Deterministic script that converts a unified ._planning.json into the
# complete work structure: goals/, projects/, and tasks/ directories.
#
# Supersedes generate-goals.sh by handling all three levels in one pass.
#
# Usage:
#   bash generate-plan.sh <company-root> <planning-json-path>
#
# The planning JSON structure:
#   {
#     "goals": [...],        (same format as ._goals.json)
#     "projects": [...],     (PROJECT.md definitions)
#     "tasks": {
#       "projects": { "<project-slug>": [...] },
#       "companyLevel": [...]
#     }
#   }
#
# Output:
#   - goals/{slug}/GOAL.md with subgoals as nested subfolders
#   - projects/{slug}/PROJECT.md with frontmatter and body
#   - projects/{slug}/tasks/{NN-slug}/TASK.md with ordering prefixes
#   - tasks/{NN-slug}/TASK.md for company-level tasks
#
# Validation:
#   - 2-5 top-level goals required
#   - Every goal must have slug and title
#   - Max 4 levels of subgoal nesting
#   - ownerAgentSlug references checked against agents/
#   - projectSlugs references checked against projects defined in JSON
#   - Task assignee references checked against agents/
# =============================================================================

set -euo pipefail

# ---- Check dependencies ----
if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required but not found. Install with: apt install jq / brew install jq"
  exit 1
fi

# ---- Parse arguments ----
if [ -z "${1:-}" ] || [ -z "${2:-}" ]; then
  echo "Usage: $0 <company-root> <planning-json-path>"
  exit 1
fi

COMPANY_ROOT="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
PLANNING_JSON="$2"

if [ ! -f "$PLANNING_JSON" ]; then
  echo "ERROR: Planning JSON file not found: $PLANNING_JSON"
  exit 1
fi

if ! jq empty "$PLANNING_JSON" 2>/dev/null; then
  echo "ERROR: Invalid JSON in planning file: $PLANNING_JSON"
  exit 1
fi

# ---- Counters ----
ERRORS=0
GOAL_FILE_COUNT=0
PROJECT_FILE_COUNT=0
TASK_FILE_COUNT=0

# =============================================================================
# Part 1: Validate Goals
# =============================================================================

GOAL_COUNT=$(jq '.goals | length' "$PLANNING_JSON")

if [ "$GOAL_COUNT" -lt 2 ]; then
  echo "ERROR: At least 2 top-level goals required, got $GOAL_COUNT"
  ERRORS=$((ERRORS + 1))
fi

if [ "$GOAL_COUNT" -gt 5 ]; then
  echo "ERROR: At most 5 top-level goals allowed, got $GOAL_COUNT"
  ERRORS=$((ERRORS + 1))
fi

# Collect project slugs from the JSON for cross-validation
PROJECT_SLUGS=$(jq -r '.projects[].slug // empty' "$PLANNING_JSON" 2>/dev/null | tr '\n' ' ')

validate_goals() {
  local json_path="$1"
  local depth="$2"

  if [ "$depth" -gt 4 ]; then
    echo "ERROR: Subgoal nesting exceeds max depth of 4 at path: $json_path"
    ERRORS=$((ERRORS + 1))
    return
  fi

  local count
  count=$(jq "$json_path | length" "$PLANNING_JSON")

  for ((i = 0; i < count; i++)); do
    local item_path="${json_path}[$i]"
    local slug title

    slug=$(jq -r "$item_path.slug // empty" "$PLANNING_JSON")
    title=$(jq -r "$item_path.title // empty" "$PLANNING_JSON")

    if [ -z "$slug" ]; then
      echo "ERROR: Missing slug at $item_path"
      ERRORS=$((ERRORS + 1))
    fi
    if [ -z "$title" ]; then
      echo "ERROR: Missing title at $item_path"
      ERRORS=$((ERRORS + 1))
    fi

    # Validate ownerAgentSlug reference
    local owner
    owner=$(jq -r "$item_path.ownerAgentSlug // empty" "$PLANNING_JSON")
    if [ -n "$owner" ] && [ -d "$COMPANY_ROOT/agents" ]; then
      if [ ! -d "$COMPANY_ROOT/agents/$owner" ]; then
        echo "WARN: ownerAgentSlug '$owner' at $item_path does not match any agent in agents/"
      fi
    fi

    # Validate projectSlugs references against projects in JSON
    local project_count
    project_count=$(jq "$item_path.projectSlugs // [] | length" "$PLANNING_JSON")
    for ((j = 0; j < project_count; j++)); do
      local project_slug
      project_slug=$(jq -r "$item_path.projectSlugs[$j]" "$PLANNING_JSON")
      if ! echo " $PROJECT_SLUGS " | grep -q " $project_slug "; then
        echo "WARN: projectSlug '$project_slug' at $item_path does not match any project in planning JSON"
      fi
    done

    # Recurse into subgoals
    local subgoal_count
    subgoal_count=$(jq "$item_path.subgoals // [] | length" "$PLANNING_JSON")
    if [ "$subgoal_count" -gt 0 ]; then
      validate_goals "$item_path.subgoals" $((depth + 1))
    fi
  done
}

validate_goals ".goals" 1

# =============================================================================
# Part 2: Validate Projects
# =============================================================================

PROJECT_COUNT=$(jq '.projects | length' "$PLANNING_JSON")

for ((i = 0; i < PROJECT_COUNT; i++)); do
  local_slug=$(jq -r ".projects[$i].slug // empty" "$PLANNING_JSON")
  local_name=$(jq -r ".projects[$i].name // empty" "$PLANNING_JSON")

  if [ -z "$local_slug" ]; then
    echo "ERROR: Missing slug at .projects[$i]"
    ERRORS=$((ERRORS + 1))
  fi
  if [ -z "$local_name" ]; then
    echo "ERROR: Missing name at .projects[$i]"
    ERRORS=$((ERRORS + 1))
  fi

  # Validate owner reference
  local_owner=$(jq -r ".projects[$i].owner // empty" "$PLANNING_JSON")
  if [ -n "$local_owner" ] && [ -d "$COMPANY_ROOT/agents" ]; then
    if [ ! -d "$COMPANY_ROOT/agents/$local_owner" ]; then
      echo "WARN: project owner '$local_owner' for project '$local_slug' does not match any agent in agents/"
    fi
  fi
done

# =============================================================================
# Part 3: Validate Tasks
# =============================================================================

# Project tasks
for project_slug in $(jq -r '.tasks.projects // {} | keys[]' "$PLANNING_JSON" 2>/dev/null); do
  task_count=$(jq ".tasks.projects[\"$project_slug\"] | length" "$PLANNING_JSON")

  # Verify project exists in projects list
  if ! echo " $PROJECT_SLUGS " | grep -q " $project_slug "; then
    echo "WARN: tasks reference project '$project_slug' but it's not in the projects list"
  fi

  for ((i = 0; i < task_count; i++)); do
    t_slug=$(jq -r ".tasks.projects[\"$project_slug\"][$i].slug // empty" "$PLANNING_JSON")
    t_assignee=$(jq -r ".tasks.projects[\"$project_slug\"][$i].assignee // empty" "$PLANNING_JSON")

    if [ -z "$t_slug" ]; then
      echo "ERROR: Missing slug at .tasks.projects[\"$project_slug\"][$i]"
      ERRORS=$((ERRORS + 1))
    fi
    if [ -z "$t_assignee" ]; then
      echo "ERROR: Missing assignee at .tasks.projects[\"$project_slug\"][$i]"
      ERRORS=$((ERRORS + 1))
    elif [ -d "$COMPANY_ROOT/agents" ] && [ ! -d "$COMPANY_ROOT/agents/$t_assignee" ]; then
      echo "WARN: task assignee '$t_assignee' for task '$t_slug' does not match any agent in agents/"
    fi
  done
done

# Company-level tasks
CL_TASK_COUNT=$(jq '.tasks.companyLevel // [] | length' "$PLANNING_JSON")
for ((i = 0; i < CL_TASK_COUNT; i++)); do
  t_slug=$(jq -r ".tasks.companyLevel[$i].slug // empty" "$PLANNING_JSON")
  t_assignee=$(jq -r ".tasks.companyLevel[$i].assignee // empty" "$PLANNING_JSON")

  if [ -z "$t_slug" ]; then
    echo "ERROR: Missing slug at .tasks.companyLevel[$i]"
    ERRORS=$((ERRORS + 1))
  fi
  if [ -z "$t_assignee" ]; then
    echo "ERROR: Missing assignee at .tasks.companyLevel[$i]"
    ERRORS=$((ERRORS + 1))
  elif [ -d "$COMPANY_ROOT/agents" ] && [ ! -d "$COMPANY_ROOT/agents/$t_assignee" ]; then
    echo "WARN: task assignee '$t_assignee' for company task '$t_slug' does not match any agent in agents/"
  fi

  # Recurring tasks must never be company-level — they must live inside a project
  t_recurring_val=$(jq -r ".tasks.companyLevel[$i].recurring // false" "$PLANNING_JSON")
  if [ "$t_recurring_val" = "true" ]; then
    echo "ERROR: Recurring task '$t_slug' must not be a company-level task. Move it into a project under tasks.projects. Recurring tasks become Routines and require a project."
    ERRORS=$((ERRORS + 1))
  fi
done

# ---- Abort on errors ----
if [ "$ERRORS" -gt 0 ]; then
  echo "ERROR: $ERRORS validation error(s) found. Fix the JSON and re-run."
  exit 1
fi

echo "[generate-plan] Validation passed. Generating files..."

# =============================================================================
# Part 4: Generate Goals
# =============================================================================

# Auto-assign level by depth
depth_to_level() {
  case "$1" in
    1) echo "company" ;;
    2) echo "team" ;;
    3) echo "agent" ;;
    *) echo "task" ;;
  esac
}

# Remove existing goals directory if present
if [ -d "$COMPANY_ROOT/goals" ]; then
  rm -rf "$COMPANY_ROOT/goals"
fi
mkdir -p "$COMPANY_ROOT/goals"

emit_goal() {
  local json_path="$1"
  local dir_path="$2"
  local depth="$3"

  local slug title description level status owner
  slug=$(jq -r "$json_path.slug" "$PLANNING_JSON")
  title=$(jq -r "$json_path.title" "$PLANNING_JSON")
  description=$(jq -r "$json_path.description // empty" "$PLANNING_JSON")
  level=$(jq -r "$json_path.level // empty" "$PLANNING_JSON")
  status=$(jq -r "$json_path.status // empty" "$PLANNING_JSON")
  owner=$(jq -r "$json_path.ownerAgentSlug // empty" "$PLANNING_JSON")

  if [ -z "$level" ]; then
    level=$(depth_to_level "$depth")
  fi
  if [ -z "$status" ]; then
    status="active"
  fi

  local goal_dir="${dir_path}/${slug}"
  mkdir -p "$goal_dir"

  local goal_file="${goal_dir}/GOAL.md"

  {
    echo "---"
    echo "title: ${title}"
    echo "level: ${level}"
    echo "status: ${status}"

    if [ -n "$owner" ]; then
      echo "ownerAgentSlug: ${owner}"
    fi

    local project_count
    project_count=$(jq "$json_path.projectSlugs // [] | length" "$PLANNING_JSON")
    if [ "$project_count" -gt 0 ]; then
      local projects
      projects=$(jq -r "[$json_path.projectSlugs[]] | join(\", \")" "$PLANNING_JSON")
      echo "projectSlugs: [${projects}]"
    fi

    echo "---"

    if [ -n "$description" ]; then
      echo ""
      echo "$description"
    fi
  } > "$goal_file"

  GOAL_FILE_COUNT=$((GOAL_FILE_COUNT + 1))

  # Recurse into subgoals
  local subgoal_count
  subgoal_count=$(jq "$json_path.subgoals // [] | length" "$PLANNING_JSON")
  if [ "$subgoal_count" -gt 0 ]; then
    for ((si = 0; si < subgoal_count; si++)); do
      emit_goal "$json_path.subgoals[$si]" "$goal_dir" $((depth + 1))
    done
  fi
}

for ((i = 0; i < GOAL_COUNT; i++)); do
  emit_goal ".goals[$i]" "$COMPANY_ROOT/goals" 1
done

echo "[generate-plan] Created $GOAL_FILE_COUNT GOAL.md files ($GOAL_COUNT top-level goals)"

# =============================================================================
# Part 5: Generate Projects
# =============================================================================

for ((i = 0; i < PROJECT_COUNT; i++)); do
  p_slug=$(jq -r ".projects[$i].slug" "$PLANNING_JSON")
  p_name=$(jq -r ".projects[$i].name" "$PLANNING_JSON")
  p_desc=$(jq -r ".projects[$i].description // empty" "$PLANNING_JSON")
  p_owner=$(jq -r ".projects[$i].owner // empty" "$PLANNING_JSON")
  p_body=$(jq -r ".projects[$i].body // empty" "$PLANNING_JSON")

  project_dir="$COMPANY_ROOT/projects/$p_slug"
  mkdir -p "$project_dir/tasks"

  project_file="$project_dir/PROJECT.md"

  {
    echo "---"
    echo "name: ${p_name}"
    if [ -n "$p_desc" ]; then
      echo "description: ${p_desc}"
    fi
    echo "slug: ${p_slug}"
    if [ -n "$p_owner" ]; then
      echo "owner: ${p_owner}"
    fi
    echo "---"

    if [ -n "$p_body" ]; then
      echo ""
      echo "$p_body"
    fi
  } > "$project_file"

  PROJECT_FILE_COUNT=$((PROJECT_FILE_COUNT + 1))
done

echo "[generate-plan] Created $PROJECT_FILE_COUNT PROJECT.md files"

# =============================================================================
# Part 6: Generate Project Tasks (with globally unique ordering prefixes)
# =============================================================================

# Global counter — numbering must be unique across the entire package
GLOBAL_TASK_ORDER=1

for project_slug in $(jq -r '.tasks.projects // {} | keys[]' "$PLANNING_JSON" 2>/dev/null); do
  task_count=$(jq ".tasks.projects[\"$project_slug\"] | length" "$PLANNING_JSON")

  for ((i = 0; i < task_count; i++)); do
    t_slug=$(jq -r ".tasks.projects[\"$project_slug\"][$i].slug" "$PLANNING_JSON")
    t_name=$(jq -r ".tasks.projects[\"$project_slug\"][$i].name" "$PLANNING_JSON")
    t_assignee=$(jq -r ".tasks.projects[\"$project_slug\"][$i].assignee" "$PLANNING_JSON")
    t_body=$(jq -r ".tasks.projects[\"$project_slug\"][$i].body // empty" "$PLANNING_JSON")
    t_recurring=$(jq -r ".tasks.projects[\"$project_slug\"][$i].recurring // false" "$PLANNING_JSON")

    # Use global counter for ordering prefix
    dir_name=$(printf "%02d-%s" "$GLOBAL_TASK_ORDER" "$t_slug")
    GLOBAL_TASK_ORDER=$((GLOBAL_TASK_ORDER + 1))

    task_dir="$COMPANY_ROOT/projects/$project_slug/tasks/$dir_name"
    mkdir -p "$task_dir"

    task_file="$task_dir/TASK.md"

    {
      echo "---"
      echo "name: ${t_name}"
      if [ -n "$t_assignee" ] && [ "$t_assignee" != "null" ]; then
        echo "assignee: ${t_assignee}"
      fi
      echo "project: ${project_slug}"
      if [ "$t_recurring" = "true" ]; then
        echo "recurring: true"
      fi
      echo "---"

      if [ -n "$t_body" ]; then
        echo ""
        echo "$t_body"
      fi
    } > "$task_file"

    TASK_FILE_COUNT=$((TASK_FILE_COUNT + 1))
  done
done

# =============================================================================
# Part 7: Generate Company-Level Tasks (continuing global ordering)
# =============================================================================

for ((i = 0; i < CL_TASK_COUNT; i++)); do
  t_slug=$(jq -r ".tasks.companyLevel[$i].slug" "$PLANNING_JSON")
  t_name=$(jq -r ".tasks.companyLevel[$i].name" "$PLANNING_JSON")
  t_assignee=$(jq -r ".tasks.companyLevel[$i].assignee" "$PLANNING_JSON")
  t_body=$(jq -r ".tasks.companyLevel[$i].body // empty" "$PLANNING_JSON")
  t_recurring=$(jq -r ".tasks.companyLevel[$i].recurring // false" "$PLANNING_JSON")

  # Use global counter for ordering prefix (continues from project tasks)
  dir_name=$(printf "%02d-%s" "$GLOBAL_TASK_ORDER" "$t_slug")
  GLOBAL_TASK_ORDER=$((GLOBAL_TASK_ORDER + 1))

  task_dir="$COMPANY_ROOT/tasks/$dir_name"
  mkdir -p "$task_dir"

  task_file="$task_dir/TASK.md"

  t_project=$(jq -r ".tasks.companyLevel[$i].project // empty" "$PLANNING_JSON")

  {
    echo "---"
    echo "name: ${t_name}"
    if [ -n "$t_assignee" ] && [ "$t_assignee" != "null" ]; then
      echo "assignee: ${t_assignee}"
    fi
    if [ -n "$t_project" ] && [ "$t_project" != "null" ]; then
      echo "project: ${t_project}"
    fi
    if [ "$t_recurring" = "true" ]; then
      echo "recurring: true"
    fi
    echo "---"

    if [ -n "$t_body" ]; then
      echo ""
      echo "$t_body"
    fi
  } > "$task_file"

  TASK_FILE_COUNT=$((TASK_FILE_COUNT + 1))
done

echo "[generate-plan] Created $TASK_FILE_COUNT TASK.md files"

# =============================================================================
# Summary
# =============================================================================

echo ""
echo "[generate-plan] Done. Generated work plan for $COMPANY_ROOT:"
echo "  Goals:    $GOAL_FILE_COUNT files ($GOAL_COUNT top-level)"
echo "  Projects: $PROJECT_FILE_COUNT files"
echo "  Tasks:    $TASK_FILE_COUNT files"
