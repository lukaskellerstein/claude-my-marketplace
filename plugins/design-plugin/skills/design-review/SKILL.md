---
name: design-review
description: >
  Review and critique existing designs, websites, or frontend code against design principles.
  Checks for common anti-patterns like generic fonts, poor contrast, inconsistent spacing, and
  lack of visual hierarchy. Use when the user asks to "review my design", "what's wrong with this
  layout", "critique my website", "how can I improve the design", "audit the UI", "check my
  frontend", "make it look more professional", or "why does this look off". Produces actionable
  feedback with specific fix suggestions referencing other skills.
---

# Design Review

Review and critique existing designs or frontend implementations against design principles. Produces actionable feedback, not just observations.

## When to Use

- User asks to review, critique, or audit a design or frontend
- User says "something looks off" but can't articulate what
- User wants to improve an existing design's visual quality
- User asks "how can I make this look more professional?"
- Before shipping a frontend — as a final design quality check

## When NOT to Use

- User wants a WCAG accessibility audit → use **design-system** (has contrast ratio calculations)
- User wants a code quality review → not a design concern
- User wants to create a new design from scratch → use **styleguide** skill first

## Review Process

### Step 1: Understand the Context

Before critiquing, establish:
- **What is this?** — landing page, dashboard, blog, app screen
- **Who is it for?** — the target audience
- **What's the intent?** — convert, inform, engage, sell
- **Is there a styleguide?** — if yes, review against it; if no, note this as issue #1

### Step 2: Evaluate Against the Checklist

Score each category 1-10 and note specific issues:

#### 1. Typography (weight: high)

| Check | What to look for |
|-------|-----------------|
| Font choice | Is it distinctive or default (Inter/Roboto/system)? Does it match the brand personality? |
| Weight variety | Are there at least 2-3 weights in use? Or is everything Regular? |
| Size hierarchy | Can you tell H1 from H2 from body at a glance? Are jumps dramatic enough? |
| Line height | Headings 1.2-1.3, body 1.5-1.6, small text 1.6-1.8? |
| Letter-spacing | Tight for headlines, normal for body, wide for labels? |
| Measure | Is body text line length 45-75 characters? |

#### 2. Color (weight: high)

| Check | What to look for |
|-------|-----------------|
| Palette coherence | Is there a defined palette or random hex values? |
| Dominance | Is there a clear primary color, or are all colors competing? |
| Contrast | Is text readable on all backgrounds? (Reference design-system for WCAG) |
| Accent usage | Is the accent color reserved for CTAs and highlights, or scattered everywhere? |
| Dark mode | If present, is it designed (not just inverted)? |

#### 3. Spacing (weight: high)

| Check | What to look for |
|-------|-----------------|
| Grid consistency | Do padding/margins align to a grid (4px or 8px)? |
| Section breathing | Do sections have enough vertical space between them? |
| Component padding | Is internal padding consistent within similar components? |
| Density | Is the density appropriate for the audience? (Dashboards = dense, marketing = spacious) |

#### 4. Visual Hierarchy (weight: high)

| Check | What to look for |
|-------|-----------------|
| Entry point | Can you tell what to look at first within 2 seconds? |
| Visual path | Is there a clear flow from primary → secondary → tertiary content? |
| CTA prominence | Are call-to-action elements visually dominant? |
| Information grouping | Are related elements visually grouped and separated from unrelated ones? |

#### 5. Imagery (weight: medium)

| Check | What to look for |
|-------|-----------------|
| Relevance | Do images support the content or just fill space? |
| Quality | Are images high-resolution and properly sized? |
| Style consistency | Do all images share a visual style (color grading, photography style)? |
| Empty states | Are there proper placeholders for missing images? |

#### 6. Motion & Interaction (weight: medium)

| Check | What to look for |
|-------|-----------------|
| Purpose | Are animations meaningful or just decorative? |
| Page load | Is there an orchestrated reveal or does everything appear at once? |
| Hover states | Do interactive elements respond to hover? |
| Transitions | Are transitions smooth (0.2-0.4s) with appropriate easing? |

#### 7. Consistency (weight: medium)

| Check | What to look for |
|-------|-----------------|
| Border radius | Is the same radius used across similar components? |
| Shadow system | Are shadows consistent (not random box-shadow values)? |
| Button styles | Do all buttons of the same type look identical? |
| Spacing tokens | Are the same spacing values reused or are there arbitrary numbers? |

#### 8. Distinctiveness (weight: low but important)

| Check | What to look for |
|-------|-----------------|
| Memorability | Would you remember this site after seeing 10 others? |
| Character | Does it reflect the brand's personality or feel template-generated? |
| Surprise | Is there at least one unexpected or delightful detail? |
| Anti-patterns | Does it fall into any patterns from the **frontend-aesthetics** anti-patterns catalog? |

### Step 3: Produce the Review

Use this output format:

```markdown
# Design Review: [Project/Page Name]

## Overall Impression
[2-3 sentences capturing the design's current state and biggest opportunity]

## Scores

| Category | Score | Key Issue |
|----------|-------|-----------|
| Typography | _/10 | [one-line summary] |
| Color | _/10 | [one-line summary] |
| Spacing | _/10 | [one-line summary] |
| Hierarchy | _/10 | [one-line summary] |
| Imagery | _/10 | [one-line summary] |
| Motion | _/10 | [one-line summary] |
| Consistency | _/10 | [one-line summary] |
| Distinctiveness | _/10 | [one-line summary] |
| **Overall** | **_/10** | |

## Top 3 Issues

### 1. [Issue title]
**Problem**: [what's wrong and why it matters]
**Fix**: [specific action — reference other skills]
**Impact**: High/Medium/Low

### 2. [Issue title]
...

### 3. [Issue title]
...

## Quick Wins
[3-5 changes that would have the most visual impact for the least effort]

1. [Quick win] — [estimated effort: 5 min / 15 min / 30 min]
2. ...

## Recommended Next Steps
- [ ] [Action item referencing specific skill/plugin]
- [ ] ...
```

## Review Examples

### Common Issue → Fix Mapping

| Issue Found | Recommended Fix | Plugin/Skill Reference |
|-------------|----------------|----------------------|
| Default fonts (Inter everywhere) | Choose a distinctive font pairing | **styleguide** skill → font-pairings.md |
| No color palette (random hex values) | Define a color strategy | **styleguide** skill → color-moods.md |
| Poor contrast ratios | Check and fix WCAG compliance | **design-system** |
| Generic layout | Apply spatial composition techniques | **frontend-aesthetics** → layout-composition.md |
| No animations | Add orchestrated page load | **frontend-aesthetics** → motion-choreography.md |
| Stock-looking components | Apply component recipes | **frontend-aesthetics** → component-recipes.md |
| Inconsistent imagery | Craft a style prefix for all images | **media-prompt-craft** skill |
| No styleguide exists | Create one before fixing individual issues | **styleguide** skill |

## Tips

- Lead with what's working before diving into issues — design critique should be constructive
- Prioritize issues by impact — a bad font choice affects everything, a missing hover state affects one element
- Always provide the fix, not just the problem — "the font is generic" is useless without "try Space Grotesk + DM Sans"
- If there's no styleguide, that IS the top issue — individual fixes won't create coherence without a foundation
- Screenshots or code snippets make feedback much more actionable
