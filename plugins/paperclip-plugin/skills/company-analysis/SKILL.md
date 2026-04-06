---
name: company-analysis
description: >
  Analyze a running Paperclip company and produce actionable improvement suggestions —
  identify bottlenecks, budget imbalances, missing skills, org structure issues, and
  stalled tasks. Use when diagnosing a struggling company, optimizing an existing one,
  or auditing company health.
---

# Company Analysis Skill

Read the state of a running Paperclip company and produce a structured analysis with actionable recommendations.

## When to Use

- User wants to diagnose why a company isn't performing well
- User wants to optimize budgets or org structure
- User invokes `/company-analyze`
- Periodic health check of a running company

## Analysis Checklist

### 1. Org Structure

- Are there agents without clear reporting lines?
- Is any manager overloaded (>5 direct reports)?
- Are there roles missing for the company's goals?
- Is the tree too deep (>3 levels) or too flat?
- Are there agents with no tasks assigned?

### 2. Agent Health

- Agents consistently hitting budget limits (>80% usage)
- Agents with very low utilization (<20%)
- Agents stuck on the same task for multiple heartbeats
- Agents with error states or failed runs
- Agents with stale sessions that haven't run recently

### 3. Task Flow

- Tasks stuck in `blocked` status for >24 hours
- Tasks with no assignee
- Delegation bottlenecks (one agent creating all subtasks)
- Tasks missing `parentId` or `goalId`
- High ratio of blocked-to-active tasks

### 4. Budget Analysis

- Total company budget vs actual usage
- Per-agent budget allocation vs usage
- Agents that need more budget (hitting limits regularly)
- Agents that need less budget (consistently underutilizing)
- Cost per completed task trends

### 5. Skills & Tools

- Agents missing skills that would help their role
- Agents with MCP servers they don't use
- Missing plugins that would improve effectiveness (see `references/analysis-checklist.md`)

### 6. Goal Alignment

- Are all goals covered by at least one project?
- Are there orphaned tasks not connected to any goal?
- Is work evenly distributed across goals?

## API Endpoints for Analysis

```bash
# Company overview
GET /api/companies/{companyId}
GET /api/companies/{companyId}/dashboard

# Agents
GET /api/companies/{companyId}/agents

# Issues/tasks
GET /api/companies/{companyId}/issues
GET /api/companies/{companyId}/issues?status=blocked
GET /api/companies/{companyId}/issues?status=in_progress

# Goals
GET /api/companies/{companyId}/goals

# Projects
GET /api/companies/{companyId}/projects

# Skills
GET /api/companies/{companyId}/skills
```

## Report Format

```markdown
## Company Analysis: {Company Name}

### Critical Issues
{Issues actively blocking work — fix these first}

### Recommendations
{Improvements that would increase effectiveness}

### Optimizations
{Nice-to-haves for efficiency}

### Metrics Summary
| Metric | Value |
|--------|-------|
| Total agents | X |
| Active tasks | X |
| Blocked tasks | X |
| Budget utilization | X% |
| Avg tasks per agent | X |
| Suggested changes | X |
```

## Recommendation Types

For each finding, offer one of:
- **Hire** — suggest a new agent with role, skills, and budget
- **Restructure** — move an agent to a different manager
- **Rebudget** — increase/decrease an agent's monthly budget
- **Reskill** — add/remove skills or plugins for an agent
- **Retask** — reassign blocked or orphaned tasks
- **Remove** — suggest removing an underutilized agent
