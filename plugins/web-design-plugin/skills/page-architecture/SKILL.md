---
name: page-architecture
description: >
  Information architecture and content planning for websites — page structure, section definitions,
  content hierarchy, text content, and mock data strategy. Use when planning what pages a website
  needs, what sections go on each page, what content fills them, when the user asks "what
  pages/sections should my website have?", needs mock data for a prototype, or needs text
  content (headlines, body, CTAs) for sections.
---

# Page Architecture

The bridge between business brief and design implementation. This skill defines WHAT goes where (information architecture) — not HOW it looks (that's **frontend-aesthetics**) or what style it has (that's **styleguide**).

## Purpose

Every website starts as a blank canvas with the same question: "What pages do we need, and what goes on each page?" Page architecture answers this by translating business goals into a structured content plan. The output is a page specification document that downstream skills (frontend-aesthetics, css-architecture, animation-system) can execute against.

**This skill produces:**
- Site map with all pages and routes
- Section-by-section breakdown for each page
- Actual written content (headlines, body copy, CTAs)
- Media and icon requirements per section
- Mock data specifications for dynamic content
- Animation intent notes for the animation-system skill

**This skill does NOT produce:**
- Visual design decisions (colors, fonts, spacing) — see **styleguide**
- Component implementation details — see **css-architecture**
- Motion/animation specifics — see **animation-system**
- Image/media assets — see **media-plugin**

## When NOT to Use

- User wants visual design polish → use **frontend-aesthetics**
- User wants a color palette or font pairing → use **styleguide**
- User wants CSS/component structure → use **css-architecture**
- User wants to generate actual images → use **media-plugin/image-generation**

## Page Architecture Workflow

### Step 1: Extract Brief Information

Pull key details from the user's brief or conversation:

- **Business type** — SaaS, e-commerce, portfolio, agency, restaurant, etc.
- **Primary goal** — Sign-ups, purchases, lead generation, information, brand awareness
- **Target audience** — Demographics, technical sophistication, pain points
- **Key features/products** — What needs to be showcased
- **Tone of voice** — Professional, playful, technical, luxurious, approachable
- **Competitive context** — What similar sites exist, how to differentiate
- **Content assets available** — Photos, testimonials, case studies, team bios, pricing info

### Step 2: Determine Page Count and Types

Match the business type to a page template from `references/page-templates.md`. Adjust based on:

- **Scope** — MVP launch page (1-3 pages) vs. full marketing site (5-10 pages) vs. web application (many views)
- **Conversion funnel** — Every page should have a clear role in moving users toward the primary goal
- **Content readiness** — Do not plan pages the client cannot populate with real content

### Step 3: Define Sections Per Page

For each page, select sections from `references/section-catalog.md`. Order sections following conversion funnel logic:

1. **Hook** — Capture attention (hero, headline)
2. **Build trust** — Establish credibility (social proof, logos, stats)
3. **Demonstrate value** — Show what you offer (features, demos, examples)
4. **Prove it works** — Evidence (testimonials, case studies, results)
5. **Remove friction** — Address objections (FAQ, guarantees, comparisons)
6. **Convert** — Clear call to action (CTA, pricing, sign-up)

### Step 4: Write Content for Each Section

Using patterns from `references/content-patterns.md`, write actual content — not placeholder text. Every section needs:

- **Headline** — Benefit-driven, specific, 5-10 words
- **Supporting copy** — Expands on the headline, 15-25 words for subheadlines, scannable paragraphs for body text
- **CTA text** — Action-oriented with clear value proposition
- **Data/lists** — Feature names, pricing tiers, team bios, etc.

### Step 5: Define Mock Data Requirements

For any dynamic or repeating content, specify mock data using patterns from `references/mock-data.md`:

- What data shape is needed (user profiles, product cards, blog posts, etc.)
- How many items to generate
- What edge cases to include
- Whether data should be static in JSX or imported from a data file

### Step 6: Output the Page Specification

Produce a structured document using the template below.

## Page Specification Template

```markdown
# Page Architecture: [Project Name]

## Overview
- **Business type:** [type]
- **Primary goal:** [goal]
- **Target audience:** [audience]
- **Tone of voice:** [tone]
- **Page count:** [number]

## Site Map
- Home (/)
- About (/about)
- Features (/features)
- Pricing (/pricing)
- Contact (/contact)

---

## Page: Home

**Purpose:** [What this page accomplishes in the conversion funnel]
**Primary CTA:** [The single most important action on this page]

### Section 1: Hero
- **Purpose:** First impression, primary value proposition
- **Layout type:** Full-width hero with CTA
- **Content:**
  - Headline: "[actual headline text]"
  - Subheadline: "[actual subheadline]"
  - CTA primary: "[button text]" → [destination]
  - CTA secondary: "[button text]" → [destination]
- **Media needs:**
  - Hero background: [description for media-prompt-craft]
  - Logo: [shared asset]
- **Icons needed:** [list with specific icon names]
- **Mock data:** none
- **Animation intent:** [brief description for animation-system]

### Section 2: Features Grid
- **Purpose:** Showcase key features/benefits
- **Layout type:** 3-column card grid
- **Content:**
  - Section headline: "[text]"
  - Section subheadline: "[text]"
  - Card 1: { icon: "[name]", title: "[text]", description: "[text]" }
  - Card 2: { icon: "[name]", title: "[text]", description: "[text]" }
  - Card 3: { icon: "[name]", title: "[text]", description: "[text]" }
- **Media needs:** [per-card icons or illustrations]
- **Mock data:** none
- **Animation intent:** stagger reveal on scroll

### Section 3: Social Proof
- **Purpose:** Build trust with recognizable logos
- **Layout type:** Logo bar, auto-scrolling
- **Content:**
  - Section label: "Trusted by leading teams"
  - Logos: [list of 6-8 company names]
- **Media needs:** SVG logos for each company
- **Mock data:** none
- **Animation intent:** infinite horizontal scroll

### Section 4: Testimonials
- **Purpose:** Prove value through customer voices
- **Layout type:** 3-card grid with photo, quote, attribution
- **Content:**
  - Testimonial 1: { quote: "[text]", name: "[name]", title: "[title]", company: "[company]" }
  - Testimonial 2: ...
  - Testimonial 3: ...
- **Media needs:** headshot photos for each testimonial
- **Mock data:** Use faker for additional testimonials if carousel
- **Animation intent:** fade-in on scroll

### Section 5: CTA Banner
- **Purpose:** Final conversion push
- **Layout type:** Full-width banner with centered content
- **Content:**
  - Headline: "[text]"
  - Subheadline: "[text]"
  - CTA: "[button text]" → [destination]
- **Media needs:** none (gradient background)
- **Mock data:** none
- **Animation intent:** subtle background animation

### Section 6: Footer
- **Purpose:** Navigation, legal, secondary links
- **Layout type:** Multi-column footer
- **Content:**
  - Column 1 "Product": [link list]
  - Column 2 "Company": [link list]
  - Column 3 "Resources": [link list]
  - Column 4 "Legal": [link list]
  - Social links: [list]
  - Copyright: "[text]"
- **Media needs:** social media icons
- **Mock data:** none
- **Animation intent:** none
```

## Content Writing Guidelines

### Headlines That Work

**Do:** Write benefit-driven, specific headlines.
```
"Ship features 10x faster with AI-powered code review"
"Your customers deserve answers in seconds, not hours"
"The design tool that thinks like your team does"
```

**Don't:** Write vague, generic headlines.
```
"Welcome to Our Platform"          — says nothing
"The Best Solution for You"        — could be anything
"Innovation Meets Excellence"      — corporate buzzword soup
```

### Subheadlines That Support

The subheadline expands on the headline with specifics. It should be 15-25 words and answer the "how" or "what" that the headline promises.

```
Headline: "Ship features 10x faster with AI-powered code review"
Subheadline: "Automated pull request analysis catches bugs, suggests improvements, and
approves clean code — so your team spends less time reviewing and more time building."
```

### Body Copy That Scans

- Short paragraphs (2-3 sentences max)
- Bullet points for lists of features or benefits
- Bold key phrases for skimmers
- One idea per paragraph

### CTAs That Convert

**High commitment (primary):**
- "Start Free Trial" — clear, low risk
- "Book a Demo" — human touch
- "Get Started for Free" — emphasizes no cost

**Low commitment (secondary):**
- "See How It Works" — curiosity-driven
- "View Examples" — proof-driven
- "Learn More" — minimal commitment

**Avoid:**
- "Submit" — robotic
- "Click Here" — meaningless
- "Sign Up" — too generic, does not communicate value

### Writing Real Content, Not Filler

Every piece of text in the page specification should be project-specific. If you find yourself writing "Lorem ipsum" or "[placeholder text]", stop and write actual content based on the brief. Even for mock data scenarios, use realistic, contextually appropriate text.

## Cross-References

- **Section catalog with variants** — `references/section-catalog.md`
- **Page templates by business type** — `references/page-templates.md`
- **Content writing patterns and formulas** — `references/content-patterns.md`
- **Mock data generation patterns** — `references/mock-data.md`
- **Visual design and aesthetics** — `../frontend-aesthetics/` (design-plugin)
- **Style definitions** — `../styleguide/` (design-plugin)
- **Animation specifications** — `../animation-system/SKILL.md`
- **CSS and component structure** — `../css-architecture/SKILL.md`
- **Image generation prompts** — media-plugin skills
