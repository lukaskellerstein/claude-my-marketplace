# Section Catalog

A detailed catalog of reusable website sections. For each section type: variants, layout description, content slots, when to use, and responsive behavior.

---

## Hero Sections

The first thing visitors see. Must communicate the core value proposition within 5 seconds.

### Variant 1: Full-Screen Image Hero

**Layout:** Full-viewport background image with overlay. Centered text content with headline, subheadline, and 1-2 CTAs. Optional scroll indicator at bottom.

**Content slots:**
- Background image (high-res, 1920x1080 minimum)
- Dark/gradient overlay (for text readability)
- Headline (5-10 words)
- Subheadline (15-25 words)
- Primary CTA button
- Secondary CTA button or link (optional)
- Scroll indicator arrow (optional)

**When to use:** Photography-driven brands, travel, hospitality, luxury products. When you have a stunning hero image that tells the brand story.

**Responsive:** Image crops to center on mobile. Text stack remains centered. CTAs go full-width on small screens. Minimum height 100vh on desktop, auto on mobile (content should not be cut off).

### Variant 2: Split-Content Hero

**Layout:** Two-column layout. Left column: headline, subheadline, CTAs, and optional trust badges. Right column: product screenshot, illustration, or device mockup.

**Content slots:**
- Headline (5-10 words)
- Subheadline (15-25 words)
- Primary CTA button
- Secondary CTA button (optional)
- Trust badges or social proof line (optional, e.g., "Rated 4.9/5 by 2,000+ users")
- Right-side media: screenshot, illustration, mockup, or animated demo

**When to use:** SaaS products, apps, tools — anything where showing the product alongside the pitch strengthens the message.

**Responsive:** Stacks to single column on mobile (text on top, image below). Image may be hidden or reduced on very small screens if it is decorative.

### Variant 3: Video Background Hero

**Layout:** Full-viewport looping video (muted, no controls) with overlay. Centered text content. Video should be atmospheric, not informational.

**Content slots:**
- Background video (MP4, 15-30 seconds loop, muted)
- Fallback image (for slow connections and mobile)
- Dark overlay (heavier than image hero, 60-70% opacity)
- Headline
- Subheadline
- Primary CTA button

**When to use:** Experiences, events, creative agencies, lifestyle brands. The video should evoke a feeling, not explain the product.

**Responsive:** Falls back to static image on mobile (video autoplay is unreliable and battery-draining). Reduce overlay opacity if using a darker fallback image.

### Variant 4: Animated Text Hero

**Layout:** Minimal background (solid color, subtle gradient, or abstract pattern). Large, dramatically animated headline with rotating words, typewriter effect, or kinetic typography.

**Content slots:**
- Background (solid, gradient, or subtle pattern)
- Animated headline with rotating/changing words
- Static subheadline
- Primary CTA button
- Optional decorative elements (floating shapes, particles)

**When to use:** Tech-forward brands, creative agencies, developer tools. When the product is abstract and you want the copy itself to be the visual centerpiece.

**Responsive:** Reduce animation complexity on mobile. Ensure rotating text does not cause layout shifts. Font size scales down but maintains readability.

### Variant 5: Minimal Hero

**Layout:** Clean, spacious layout with generous whitespace. Large headline, brief subheadline, single CTA. No hero image — the typography IS the design.

**Content slots:**
- Headline (large, bold typography)
- Subheadline (1-2 sentences)
- Single CTA button
- Optional: small decorative accent (line, dot, shape)

**When to use:** Premium/luxury brands, minimalist products, editorial sites. When confidence and restraint communicate quality better than busy visuals.

**Responsive:** Scales naturally. Reduce font sizes proportionally. Maintain generous padding ratios.

---

## Social Proof

Build trust by showing who else uses or endorses the product.

### Variant 1: Logo Bar

**Layout:** Horizontal row of grayscale client/partner logos. Often preceded by a label like "Trusted by" or "Used by teams at". Logos may auto-scroll on a ticker.

**Content slots:**
- Section label ("Trusted by leading teams")
- 6-12 company logos (SVG, grayscale, consistent height ~30-40px)

**When to use:** B2B products, SaaS, enterprise tools — anywhere brand recognition of your clients builds credibility.

**Responsive:** Wraps to 2 rows on tablet, auto-scrolling ticker on mobile. Alternatively, show 4-5 logos with horizontal scroll.

### Variant 2: Stats Counter

**Layout:** 3-4 large numbers in a row with labels. Numbers may animate (count up) on scroll. Background can be colored or have a subtle pattern for visual separation.

**Content slots:**
- 3-4 stat items, each with:
  - Number (e.g., "10,000+", "99.9%", "150+")
  - Label (e.g., "Active users", "Uptime", "Countries served")

**When to use:** When you have impressive quantitative proof — user counts, uptime stats, revenue generated, countries served. Numbers must be real and specific.

**Responsive:** 2x2 grid on mobile. Keep numbers large and labels small.

### Variant 3: Trust Badges

**Layout:** Row of certification badges, security seals, award logos, or review platform ratings (e.g., G2, Capterra, Product Hunt badges).

**Content slots:**
- 3-6 badges/seals (image + optional label)
- Optional link to verification page

**When to use:** E-commerce (SSL, payment badges), regulated industries (compliance certs), products with external validation (awards, review scores).

**Responsive:** Wraps naturally. Badges should be small enough that 3 fit per row on mobile.

---

## Features

Showcase what the product or service offers.

### Variant 1: Card Grid

**Layout:** 3-column grid (or 2x3, 3x2) of feature cards. Each card has an icon, title, and short description. Cards may have subtle borders, shadows, or background fills.

**Content slots per card:**
- Icon or small illustration
- Feature title (3-5 words)
- Feature description (1-2 sentences)
- Optional link ("Learn more →")

**When to use:** Products with 3-6 distinct features that can be explained briefly. The most common and versatile features layout.

**Responsive:** 2 columns on tablet, single column on mobile. Cards go full-width.

### Variant 2: Alternating Image + Text

**Layout:** Vertically stacked rows, each with an image on one side and text on the other. Rows alternate left/right image placement for visual rhythm.

**Content slots per row:**
- Image or screenshot (product in context)
- Feature headline
- Feature description (2-3 sentences, can include bullet points)
- Optional CTA link

**When to use:** Features that benefit from visual demonstration — showing the actual UI, a workflow, or a result. Good for 3-5 detailed features.

**Responsive:** Stacks to single column (image on top, text below). All rows follow the same order on mobile regardless of desktop alternation.

### Variant 3: Icon List

**Layout:** Vertical list of features, each as a single row with an icon on the left and title + description on the right. Compact and scannable.

**Content slots per item:**
- Icon
- Feature title
- Feature description (1 sentence)

**When to use:** Long feature lists (6-12 items) that need to be scannable. Comparison pages, feature breakdowns, spec lists.

**Responsive:** Naturally responsive — already single-column. May reduce icon size on mobile.

### Variant 4: Tabbed Features

**Layout:** Tab bar at top with 3-5 tabs. Each tab reveals a content panel with an image/screenshot and description. Only one panel visible at a time.

**Content slots:**
- Tab labels (3-5 short names)
- Per tab: image/screenshot + headline + description + optional CTA

**When to use:** Products with distinct feature categories or modes. When showing everything at once would overwhelm. Good for complex products with multiple use cases.

**Responsive:** Tabs become a horizontal scroll bar or accordion on mobile. Content panels stack image above text.

---

## How It Works

Explain the process or workflow in simple steps.

### Variant 1: Numbered Steps

**Layout:** 3-4 steps in a horizontal row (or vertical on mobile). Each step has a large number, title, and brief description. Steps connected by a line or arrow.

**Content slots per step:**
- Step number (large, styled)
- Step title (3-5 words)
- Step description (1-2 sentences)
- Optional icon or illustration per step

**When to use:** Simple, linear processes. Onboarding flows, purchase processes, "how to get started" sections. Works best with exactly 3 steps.

**Responsive:** Vertical stack on mobile. Numbers stay prominent. Connecting lines become vertical.

### Variant 2: Timeline

**Layout:** Vertical timeline with alternating left/right content blocks connected by a central line with dot markers. Each block has a title and description.

**Content slots per entry:**
- Milestone title
- Description (1-3 sentences)
- Optional date or phase label
- Optional image or icon

**When to use:** Processes with a clear chronological or sequential progression. Company history, project phases, implementation timelines.

**Responsive:** Single column, all entries on one side of the timeline line.

### Variant 3: Process Diagram

**Layout:** Visual flow diagram with connected nodes. Can be horizontal or branching. Each node is a labeled step with an icon.

**Content slots per node:**
- Icon
- Step label (2-4 words)
- Connection arrows to next step(s)
- Optional annotation text

**When to use:** Complex processes with branching or parallel steps. Technical products, multi-party workflows.

**Responsive:** Simplify to a vertical numbered list on mobile. The diagram visual is desktop-only.

---

## Testimonials

Prove value through customer voices.

### Variant 1: Carousel

**Layout:** Single testimonial visible at a time with navigation arrows and dots. Large quote text, author photo, name, title, and company. Optionally auto-rotates.

**Content slots:**
- Quote text (2-4 sentences)
- Author photo (circular crop)
- Author name
- Author title and company
- Star rating (optional)
- Navigation: prev/next arrows + dot indicators

**When to use:** When you have 4+ strong testimonials and want each to have full visual impact. Especially when quotes are long and detailed.

**Responsive:** Full-width on mobile. Swipeable. Reduce quote font size. Ensure dot indicators are thumb-friendly.

### Variant 2: Grid

**Layout:** 2-3 column grid of testimonial cards. Each card has a quote, author info, and optional star rating. Cards have consistent height with quote text truncated if needed.

**Content slots per card:**
- Quote text (1-3 sentences — shorter than carousel variant)
- Author photo (small, circular)
- Author name
- Author title/company
- Star rating (optional)

**When to use:** When you want to show multiple testimonials simultaneously for overwhelming social proof. Best with 3 or 6 testimonials for clean grid.

**Responsive:** Single column on mobile. Cards stack vertically.

### Variant 3: Single Featured

**Layout:** Large, centered testimonial with oversized quote marks. Big author photo, name, title. The quote is the visual centerpiece with dramatic typography.

**Content slots:**
- Large decorative quote marks
- Quote text (2-4 sentences)
- Author photo (large, 80-120px)
- Author name (prominent)
- Author title and company
- Optional company logo

**When to use:** When you have one exceptional testimonial from a recognized name or company. Quality over quantity.

**Responsive:** Scales naturally. Reduce photo size and font sizes proportionally.

---

## Pricing

Help users choose a plan and commit.

### Variant 1: Card Comparison

**Layout:** 2-4 plan cards side by side. Each card lists plan name, price, feature list, and CTA. One card (usually the middle) is visually highlighted as "recommended" or "most popular".

**Content slots per card:**
- Plan name
- Price (with billing period)
- Feature list (8-12 items, with checkmarks/crosses)
- CTA button
- Optional "Most Popular" badge on recommended plan
- Optional annual/monthly toggle above all cards

**When to use:** Standard SaaS pricing with distinct tiers. The most common and expected pricing layout.

**Responsive:** Stack vertically on mobile. Recommended plan appears first (or is visually distinguished). Feature comparison table may become a collapsible accordion.

### Variant 2: Toggle Monthly/Yearly

**Layout:** Toggle switch at top (Monthly/Yearly) that updates all prices. Cards below show the currently selected billing period. Annual pricing shows savings.

**Content slots:**
- Toggle control (Monthly / Yearly)
- Savings badge on yearly ("Save 20%")
- 2-4 plan cards (same as Card Comparison)

**When to use:** When offering both monthly and annual billing. The toggle interaction increases engagement and the savings badge nudges toward annual.

**Responsive:** Toggle stays above cards. Cards stack vertically.

### Variant 3: Single Plan Highlight

**Layout:** One prominent plan card in the center with a detailed feature breakdown. Smaller "alternative" links below for other options (enterprise, free tier).

**Content slots:**
- Plan name and price
- Tagline ("Everything you need to...")
- Detailed feature list with descriptions
- Primary CTA
- Below: links to other plans or "Contact us for Enterprise"

**When to use:** Products with one main plan (freemium with one paid tier, or when you want to funnel everyone to one option). Reduces decision paralysis.

**Responsive:** Naturally responsive — single column already.

---

## FAQ

Address common questions and remove purchase objections.

### Variant 1: Accordion

**Layout:** Vertical list of questions. Clicking a question expands it to reveal the answer. Only one answer visible at a time (others collapse) or multiple can be open.

**Content slots:**
- 6-12 question/answer pairs
- Each: question text + answer text (supports rich text, links, lists)
- Optional category groupings

**When to use:** The standard FAQ layout. Works for any number of questions. Clean and scannable.

**Responsive:** Naturally responsive — full-width on all screens. Touch targets must be large enough (minimum 48px tap area).

### Variant 2: Two-Column

**Layout:** Questions and answers displayed in a two-column grid (no accordion interaction). All answers visible simultaneously.

**Content slots:**
- 4-8 question/answer pairs
- Each: question text (bold) + answer text (regular)

**When to use:** When you have fewer questions (4-8) and want all answers visible without interaction. Good for pre-purchase pages where you do not want to hide any information.

**Responsive:** Single column on mobile. All Q&A pairs stack vertically.

---

## CTA (Call to Action)

The final conversion push. Place after you have built enough value and trust.

### Variant 1: Full-Width Banner

**Layout:** Full-width section with bold background (gradient, solid color, or image). Centered headline, subheadline, and prominent CTA button. High visual contrast from surrounding sections.

**Content slots:**
- Background (gradient, color, or image)
- Headline (5-10 words, benefit-driven)
- Subheadline (1 sentence)
- Primary CTA button (large, high-contrast)
- Optional secondary link

**When to use:** End of long pages. The visual break from the rest of the page re-captures attention. Most common CTA section type.

**Responsive:** Padding reduces on mobile. Button goes full-width.

### Variant 2: Split with Image

**Layout:** Two-column layout. One side: headline + CTA. Other side: relevant image, screenshot, or illustration.

**Content slots:**
- Headline
- Subheadline or bullet points (2-3 benefits)
- Primary CTA button
- Image or illustration

**When to use:** When you want the CTA to feel less like a "banner ad" and more like a content section. Works well mid-page.

**Responsive:** Stacks to single column. Text above, image below (or image hidden on mobile).

### Variant 3: Minimal Inline

**Layout:** Simple centered text with a CTA button. No background treatment — just content in the flow of the page. Separated by generous whitespace.

**Content slots:**
- Short headline or question
- CTA button

**When to use:** Mid-page conversion opportunities. Between content sections. When the surrounding design is already visually rich and you need simplicity.

**Responsive:** Naturally responsive. Button may go full-width on mobile.

---

## Team

Humanize the brand by showing the people behind it.

### Variant 1: Card Grid

**Layout:** 3-4 column grid of team member cards. Each card has a photo, name, role, and optional social links. Photos should be consistent style (all headshots, same background, same crop).

**Content slots per card:**
- Photo (square or circular crop, consistent across all members)
- Name
- Role/title
- Optional 1-line bio
- Optional social links (LinkedIn, Twitter)

**When to use:** Small-to-medium teams (4-12 people). Agency sites, startup pages, about pages.

**Responsive:** 2 columns on tablet, single column on mobile. Consider showing fewer team members on mobile.

### Variant 2: Horizontal Scroll

**Layout:** Horizontally scrollable row of team cards. Cards are partially visible at the edge to indicate scrollability.

**Content slots:** Same as Card Grid.

**When to use:** Large teams (12+) where a grid would be overwhelming. Also works for advisory boards or speaker lists.

**Responsive:** Naturally mobile-friendly (horizontal scroll is a native mobile interaction). Ensure scroll indicators or partial card visibility.

---

## Contact

Convert interested visitors into conversations.

### Variant 1: Form + Map

**Layout:** Two-column layout. Left: contact form (name, email, subject, message). Right: embedded map + address + phone + email.

**Content slots:**
- Form fields: name, email, phone (optional), subject/topic, message
- Submit button
- Map embed (Google Maps or Mapbox)
- Physical address
- Phone number
- Email address
- Business hours

**When to use:** Local businesses, companies with physical offices, businesses where location matters.

**Responsive:** Stacks to single column (form on top, map and details below).

### Variant 2: Minimal Form

**Layout:** Centered contact form with a headline above. No map, no extra details — just the form.

**Content slots:**
- Headline ("Get in touch" or "Let's talk")
- Subheadline (set expectations — "We'll respond within 24 hours")
- Form fields: name, email, message
- Submit button

**When to use:** Digital-first businesses, SaaS products, agencies without a public office. When simplicity and speed are priorities.

**Responsive:** Naturally responsive — already centered single-column.

### Variant 3: Multi-Channel

**Layout:** 3-column grid of contact options. Each column: icon, channel name, description, and action link. Example: Email, Phone, Live Chat.

**Content slots:**
- 3-4 contact channels, each with:
  - Icon
  - Channel name ("Email Us", "Call Us", "Live Chat")
  - Description ("For general inquiries", "Mon-Fri 9am-5pm")
  - Action link or button

**When to use:** Companies with multiple support channels. Lets users choose their preferred method.

**Responsive:** Stacks to single column on mobile.

---

## Footer

Site-wide navigation, legal information, and secondary links.

### Variant 1: Multi-Column

**Layout:** 4-5 columns of link groups with a bottom bar for copyright and legal. Optional newsletter sign-up.

**Content slots:**
- 3-5 link columns, each with:
  - Column heading ("Product", "Company", "Resources", "Legal")
  - 4-8 links per column
- Bottom bar: copyright notice, privacy/terms links
- Social media icons
- Optional newsletter input + subscribe button

**When to use:** Large sites with many pages. SaaS products, corporate sites, e-commerce stores.

**Responsive:** 2 columns on tablet, single column (accordion) on mobile. Bottom bar stacks vertically.

### Variant 2: Minimal

**Layout:** Single row with logo, a few key links, and social icons. Copyright on a second row.

**Content slots:**
- Logo or brand name
- 3-5 primary links (inline)
- Social media icons
- Copyright text

**When to use:** Simple sites, single-page sites, launch pages. When the site does not have enough pages to justify a mega footer.

**Responsive:** Links wrap to new line. Social icons center below links.

### Variant 3: Mega Footer

**Layout:** Large footer with multiple sections: link columns, newsletter sign-up, app download badges, contact info, and a secondary navigation bar. Essentially a sitemap.

**Content slots:**
- Logo + tagline
- 5-6 link columns
- Newsletter sign-up form
- App store badges (iOS, Android)
- Contact information (address, phone, email)
- Social media icons
- Bottom bar: copyright, legal links, language/currency selector

**When to use:** Enterprise sites, e-commerce stores, media sites — anywhere with a large information architecture.

**Responsive:** Collapses into an accordion of sections on mobile. App badges and contact info prioritized above link columns.

---

## Navigation

The persistent navigation element across all pages.

### Variant 1: Standard Horizontal

**Layout:** Fixed or sticky top bar. Logo on left, navigation links center or right, CTA button far right. Optional dropdown menus for sub-pages.

**Content slots:**
- Logo
- 4-7 navigation links
- Optional dropdown sub-menus
- Primary CTA button ("Sign Up", "Get Started")
- Optional secondary link ("Sign In")

**When to use:** Most websites with 4-7 top-level pages. The expected, conventional pattern.

**Responsive:** Collapses to hamburger menu on mobile (below ~768px). CTA button may remain visible alongside the hamburger icon.

### Variant 2: Hamburger Mobile-First

**Layout:** Minimal top bar with logo and hamburger icon. Full-screen overlay menu when opened. Menu contains all navigation links, CTA, and optional social links.

**Content slots:**
- Logo
- Hamburger icon (animated to X on open)
- Full-screen menu overlay:
  - Navigation links (large, tappable)
  - CTA button
  - Social media links (optional)
  - Contact info (optional)

**When to use:** Design-forward sites where the nav should not distract from the content. Sites with few pages (3-5) where the hamburger is acceptable even on desktop.

**Responsive:** Consistent across all screen sizes — always hamburger.

### Variant 3: Sidebar

**Layout:** Fixed left sidebar with logo at top, vertical navigation links, and user profile/settings at bottom. The main content occupies the remaining viewport width.

**Content slots:**
- Logo or app icon
- Vertical navigation links with icons
- Section dividers or group labels
- User avatar / profile link (bottom)
- Collapse/expand toggle

**When to use:** Web applications and dashboards. Not for marketing sites. Provides persistent navigation without taking vertical space.

**Responsive:** Collapses to icon-only sidebar on tablet. Becomes a bottom tab bar or hamburger menu on mobile.
