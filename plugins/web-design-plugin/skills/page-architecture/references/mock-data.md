# Mock Data Patterns

Patterns for generating realistic mock data for website prototypes, dashboards, and dynamic content areas.

---

## When to Use Mock Data

Mock data is needed for **dynamic content** — anything that would come from a database, API, or CMS in production:

| Content Type | Mock Data Needed? | Reason |
|---|---|---|
| Hero headline | No | Static, written in JSX |
| Feature cards (3 fixed features) | No | Static, part of the marketing copy |
| Blog post list | Yes | Dynamic, pulled from CMS |
| User profiles / team grid | Sometimes | Static if hand-curated, mock if showing many |
| Product listings | Yes | Dynamic, from product database |
| Dashboard metrics | Yes | Dynamic, from analytics API |
| Testimonials | Sometimes | Static if hand-curated (3-5), mock if showing many |
| Table data | Yes | Dynamic, from database |
| Activity feed | Yes | Dynamic, real-time data |
| Comments / reviews | Yes | User-generated content |
| Pricing tiers | No | Static, hand-written marketing copy |
| Navigation links | No | Static site structure |

**Rule of thumb:** If the content repeats in a list/grid and would come from a database in production, use mock data. If it is hand-crafted marketing copy, write it directly.

---

## Faker.js Patterns

Common data shapes using `@faker-js/faker`. Import as:

```typescript
import { faker } from '@faker-js/faker';
```

### User Profiles

```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  title: string;
  company: string;
}

function generateUser(): UserProfile {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    title: faker.person.jobTitle(),
    company: faker.company.name(),
  };
}

// Generate a list
const users = Array.from({ length: 10 }, generateUser);
```

### Product Listings

```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  rating: number;
  reviewCount: number;
  description: string;
  category: string;
  inStock: boolean;
}

function generateProduct(): Product {
  const price = parseFloat(faker.commerce.price({ min: 9.99, max: 299.99 }));
  const hasDiscount = faker.datatype.boolean(0.3);
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    price,
    originalPrice: hasDiscount ? price * 1.2 : null,
    image: faker.image.urlPicsumPhotos({ width: 400, height: 400 }),
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    reviewCount: faker.number.int({ min: 5, max: 2847 }),
    description: faker.commerce.productDescription(),
    category: faker.commerce.department(),
    inStock: faker.datatype.boolean(0.85),
  };
}
```

### Blog Posts

```typescript
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  author: {
    name: string;
    avatar: string;
  };
  publishedAt: Date;
  category: string;
  readingTime: number;
  coverImage: string;
  slug: string;
}

function generateBlogPost(): BlogPost {
  const title = faker.lorem.sentence({ min: 5, max: 10 }).replace('.', '');
  return {
    id: faker.string.uuid(),
    title,
    excerpt: faker.lorem.sentences(2),
    author: {
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
    },
    publishedAt: faker.date.recent({ days: 90 }),
    category: faker.helpers.arrayElement([
      'Engineering', 'Design', 'Product', 'Company', 'Tutorials'
    ]),
    readingTime: faker.number.int({ min: 3, max: 15 }),
    coverImage: faker.image.urlPicsumPhotos({ width: 800, height: 450 }),
    slug: faker.helpers.slugify(title).toLowerCase(),
  };
}
```

### Dashboard Metrics

```typescript
interface DashboardMetric {
  label: string;
  value: string;
  change: number; // percentage, positive or negative
  trend: 'up' | 'down' | 'flat';
  sparklineData: number[];
}

function generateMetrics(): DashboardMetric[] {
  return [
    {
      label: 'Total Revenue',
      value: `$${faker.number.int({ min: 42000, max: 185000 }).toLocaleString()}`,
      change: parseFloat((Math.random() * 20 - 5).toFixed(1)),
      trend: 'up',
      sparklineData: Array.from({ length: 12 }, () =>
        faker.number.int({ min: 30000, max: 60000 })
      ),
    },
    {
      label: 'Active Users',
      value: faker.number.int({ min: 1200, max: 9800 }).toLocaleString(),
      change: parseFloat((Math.random() * 15 - 3).toFixed(1)),
      trend: 'up',
      sparklineData: Array.from({ length: 12 }, () =>
        faker.number.int({ min: 800, max: 3000 })
      ),
    },
    {
      label: 'Conversion Rate',
      value: `${(2 + Math.random() * 4).toFixed(1)}%`,
      change: parseFloat((Math.random() * 2 - 1).toFixed(1)),
      trend: 'flat',
      sparklineData: Array.from({ length: 12 }, () =>
        parseFloat((2 + Math.random() * 3).toFixed(1))
      ),
    },
    {
      label: 'Avg. Response Time',
      value: `${faker.number.int({ min: 120, max: 450 })}ms`,
      change: parseFloat((Math.random() * -10).toFixed(1)),
      trend: 'down',
      sparklineData: Array.from({ length: 12 }, () =>
        faker.number.int({ min: 100, max: 500 })
      ),
    },
  ];
}
```

### Table Data

```typescript
interface TableRow {
  id: string;
  customer: string;
  email: string;
  plan: string;
  mrr: number;
  status: 'active' | 'churned' | 'trial' | 'past_due';
  joinedAt: Date;
  lastActive: Date;
}

function generateTableRow(): TableRow {
  const status = faker.helpers.arrayElement([
    'active', 'active', 'active', 'active',
    'churned', 'trial', 'past_due'
  ]) as TableRow['status'];

  return {
    id: faker.string.uuid(),
    customer: faker.company.name(),
    email: faker.internet.email(),
    plan: faker.helpers.arrayElement(['Free', 'Starter', 'Pro', 'Enterprise']),
    mrr: faker.helpers.arrayElement([0, 29, 29, 79, 79, 79, 199, 499]),
    status,
    joinedAt: faker.date.past({ years: 2 }),
    lastActive: status === 'churned'
      ? faker.date.past({ years: 1 })
      : faker.date.recent({ days: 7 }),
  };
}

const tableData = Array.from({ length: 50 }, generateTableRow);
```

### Activity Feed

```typescript
interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  action: string;
  target: string;
  timestamp: Date;
  details?: string;
}

function generateActivity(): ActivityItem {
  const actions = [
    { action: 'created', target: `project "${faker.commerce.productName()}"` },
    { action: 'commented on', target: `pull request #${faker.number.int({ min: 100, max: 999 })}` },
    { action: 'deployed', target: `v${faker.system.semver()} to production` },
    { action: 'invited', target: `${faker.person.fullName()} to the team` },
    { action: 'merged', target: `branch "${faker.git.branch()}"` },
    { action: 'updated', target: `billing plan to ${faker.helpers.arrayElement(['Pro', 'Enterprise'])}` },
    { action: 'resolved', target: `issue #${faker.number.int({ min: 1, max: 500 })}` },
  ];

  const { action, target } = faker.helpers.arrayElement(actions);

  return {
    id: faker.string.uuid(),
    user: {
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
    },
    action,
    target,
    timestamp: faker.date.recent({ days: 3 }),
  };
}
```

### Comments / Reviews

```typescript
interface Review {
  id: string;
  user: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  rating: number;
  title: string;
  text: string;
  date: Date;
  helpful: number;
}

function generateReview(): Review {
  const rating = faker.helpers.weightedArrayElement([
    { value: 5, weight: 40 },
    { value: 4, weight: 30 },
    { value: 3, weight: 15 },
    { value: 2, weight: 10 },
    { value: 1, weight: 5 },
  ]);

  return {
    id: faker.string.uuid(),
    user: {
      name: faker.person.fullName(),
      avatar: faker.image.avatar(),
      verified: faker.datatype.boolean(0.7),
    },
    rating,
    title: faker.lorem.sentence({ min: 3, max: 8 }).replace('.', ''),
    text: faker.lorem.paragraph({ min: 1, max: 4 }),
    date: faker.date.recent({ days: 180 }),
    helpful: faker.number.int({ min: 0, max: 42 }),
  };
}
```

---

## Realistic Data Tips

### Use Real-Sounding Names and Companies

**Bad:**
```json
{ "company": "Company A", "user": "User 1", "product": "Product X" }
```

**Good:**
```json
{ "company": "Meridian Analytics", "user": "Sarah Chen", "product": "Aero Pro Wireless Earbuds" }
```

Faker generates realistic names by default. For hand-written static mock data, use names that sound like real businesses.

### Vary Data Lengths

Not all descriptions are the same length. Not all names are short. Include variation:

```json
[
  { "name": "AI", "description": "Machine learning tools." },
  { "name": "Enterprise Resource Planning", "description": "Comprehensive suite for managing business operations including inventory, HR, finance, and supply chain across multiple departments and locations." },
  { "name": "CRM", "description": "Customer relationship management with contact tracking and pipeline visualization." }
]
```

### Include Edge Cases

Design should handle unusual data gracefully:

- **Long names:** "Alexandria Bartholomew-Richardson III" — does it truncate or wrap?
- **Missing avatars:** Some users will not have profile photos. Show initials or a default.
- **Zero values:** A metric showing "$0" or "0 users" — does the UI handle it?
- **Large numbers:** "1,284,937 active users" — does it overflow its container?
- **Empty strings:** A product with no description — does the card look broken?
- **Single item:** A list with only 1 item — does the grid/carousel still look right?

### Use Realistic Numbers

**Bad (too round, too neat):**
```json
{ "users": 10000, "revenue": 50000, "conversion": 5.0 }
```

**Good (realistic, organic-feeling):**
```json
{ "users": 10847, "revenue": 48293, "conversion": 4.7 }
```

Metrics should feel like real data, not demo placeholders.

### Dates Relative to Now

Use `faker.date.recent()` and `faker.date.past()` rather than hardcoded dates. For static JSON, write dates relative to the current period:

```json
{
  "publishedAt": "2 days ago",
  "lastActive": "5 minutes ago",
  "joinedAt": "March 2024"
}
```

Or use ISO strings and format them in the component.

---

## JSON Mock Data Templates

Ready-to-use JSON structures for common patterns. Copy into a `data/` or `mocks/` directory.

### Team Members (Static)

```json
[
  {
    "name": "Sarah Chen",
    "role": "CEO & Co-founder",
    "bio": "Former VP of Engineering at Stripe. Built payment systems processing $2B annually.",
    "avatar": "/images/team/sarah.jpg",
    "linkedin": "https://linkedin.com/in/sarachen",
    "twitter": "https://twitter.com/sarachen"
  },
  {
    "name": "Marcus Rodriguez",
    "role": "CTO & Co-founder",
    "bio": "Ex-Google Staff Engineer. Led the team that built Cloud Spanner's query optimizer.",
    "avatar": "/images/team/marcus.jpg",
    "linkedin": "https://linkedin.com/in/marcusrodriguez"
  },
  {
    "name": "Aisha Patel",
    "role": "Head of Design",
    "bio": "Previously at Figma and Airbnb. Passionate about design systems and accessibility.",
    "avatar": "/images/team/aisha.jpg",
    "linkedin": "https://linkedin.com/in/aishapatel",
    "twitter": "https://twitter.com/aishapatel"
  },
  {
    "name": "James Okafor",
    "role": "Head of Growth",
    "bio": "Grew Notion's user base from 1M to 30M. Data-driven marketer and community builder.",
    "avatar": "/images/team/james.jpg",
    "linkedin": "https://linkedin.com/in/jamesokafor"
  }
]
```

### Testimonials (Static)

```json
[
  {
    "quote": "We cut our deployment time from 45 minutes to under 3 minutes. The engineering team actually looks forward to shipping now.",
    "name": "Emily Nakamura",
    "title": "VP of Engineering",
    "company": "Meridian Analytics",
    "avatar": "/images/testimonials/emily.jpg",
    "logo": "/images/logos/meridian.svg"
  },
  {
    "quote": "The ROI was obvious within the first week. We cancelled three other tools because this one handled everything.",
    "name": "David Kowalski",
    "title": "CTO",
    "company": "Terraform Labs",
    "avatar": "/images/testimonials/david.jpg",
    "logo": "/images/logos/terraform.svg"
  },
  {
    "quote": "I was skeptical about switching, but the migration took 20 minutes and the support team held our hand through the whole thing.",
    "name": "Priya Sharma",
    "title": "Engineering Manager",
    "company": "Volta Health",
    "avatar": "/images/testimonials/priya.jpg",
    "logo": "/images/logos/volta.svg"
  }
]
```

### Pricing Tiers (Static)

```json
[
  {
    "name": "Free",
    "price": 0,
    "period": "forever",
    "description": "For individuals and small projects",
    "cta": "Get Started Free",
    "highlighted": false,
    "features": [
      { "text": "Up to 3 projects", "included": true },
      { "text": "1,000 API calls / month", "included": true },
      { "text": "Community support", "included": true },
      { "text": "Basic analytics", "included": true },
      { "text": "Custom domains", "included": false },
      { "text": "Team collaboration", "included": false },
      { "text": "Priority support", "included": false },
      { "text": "SSO / SAML", "included": false }
    ]
  },
  {
    "name": "Pro",
    "price": 29,
    "period": "per month",
    "description": "For growing teams that need more power",
    "cta": "Start Free Trial",
    "highlighted": true,
    "badge": "Most Popular",
    "features": [
      { "text": "Unlimited projects", "included": true },
      { "text": "100,000 API calls / month", "included": true },
      { "text": "Email support (24h response)", "included": true },
      { "text": "Advanced analytics", "included": true },
      { "text": "Custom domains", "included": true },
      { "text": "Team collaboration (up to 10)", "included": true },
      { "text": "Priority support", "included": false },
      { "text": "SSO / SAML", "included": false }
    ]
  },
  {
    "name": "Enterprise",
    "price": null,
    "period": "custom",
    "description": "For organizations with advanced needs",
    "cta": "Talk to Sales",
    "highlighted": false,
    "features": [
      { "text": "Unlimited everything", "included": true },
      { "text": "Unlimited API calls", "included": true },
      { "text": "Dedicated account manager", "included": true },
      { "text": "Custom analytics & reports", "included": true },
      { "text": "Custom domains", "included": true },
      { "text": "Unlimited team members", "included": true },
      { "text": "Priority support (1h response)", "included": true },
      { "text": "SSO / SAML", "included": true }
    ]
  }
]
```

### Navigation Links (Static)

```json
{
  "main": [
    { "label": "Product", "href": "/product", "children": [
      { "label": "Features", "href": "/features", "description": "Everything included in the platform" },
      { "label": "Integrations", "href": "/integrations", "description": "Connect with your existing tools" },
      { "label": "Changelog", "href": "/changelog", "description": "See what's new" }
    ]},
    { "label": "Pricing", "href": "/pricing" },
    { "label": "Docs", "href": "/docs" },
    { "label": "Blog", "href": "/blog" }
  ],
  "footer": {
    "Product": [
      { "label": "Features", "href": "/features" },
      { "label": "Pricing", "href": "/pricing" },
      { "label": "Integrations", "href": "/integrations" },
      { "label": "Changelog", "href": "/changelog" },
      { "label": "Roadmap", "href": "/roadmap" }
    ],
    "Company": [
      { "label": "About", "href": "/about" },
      { "label": "Blog", "href": "/blog" },
      { "label": "Careers", "href": "/careers" },
      { "label": "Press", "href": "/press" }
    ],
    "Resources": [
      { "label": "Documentation", "href": "/docs" },
      { "label": "API Reference", "href": "/api" },
      { "label": "Community", "href": "/community" },
      { "label": "Status", "href": "https://status.example.com" }
    ],
    "Legal": [
      { "label": "Privacy", "href": "/privacy" },
      { "label": "Terms", "href": "/terms" },
      { "label": "Security", "href": "/security" }
    ]
  },
  "social": [
    { "platform": "Twitter", "href": "https://twitter.com/example", "icon": "twitter" },
    { "platform": "GitHub", "href": "https://github.com/example", "icon": "github" },
    { "platform": "LinkedIn", "href": "https://linkedin.com/company/example", "icon": "linkedin" },
    { "platform": "Discord", "href": "https://discord.gg/example", "icon": "discord" }
  ]
}
```

---

## Static vs Dynamic: When to Hardcode vs Import

### Hardcode Directly in JSX

Content that is part of the marketing message and will not change frequently:

- Hero headlines and subheadlines
- Feature card content (when you have exactly 3-6 fixed features)
- CTA text
- FAQ questions and answers
- Pricing tier details
- Footer link structure

```tsx
// Hardcoded — this IS the marketing copy
<h1>Ship features 10x faster with AI-powered code review</h1>
<p>Automated pull request analysis catches bugs and suggests improvements.</p>
```

### Import from a Data File

Content that is repeated, dynamic, or likely to be replaced with API data:

- Blog post listings
- Product catalogs
- User-generated content (reviews, comments)
- Dashboard data (metrics, tables, charts)
- Team member grids (when >4 members)
- Activity feeds

```tsx
// Imported — this will come from an API in production
import { blogPosts } from '@/data/mock/blog-posts';

{blogPosts.map(post => (
  <BlogCard key={post.id} {...post} />
))}
```

### File Organization

```
src/
  data/
    mock/
      blog-posts.ts      // Array of BlogPost objects
      products.ts         // Array of Product objects
      team.ts             // Array of TeamMember objects
      testimonials.ts     // Array of Testimonial objects
      dashboard.ts        // Dashboard metrics, chart data
    navigation.ts         // Nav links (static, not mock)
    pricing.ts            // Pricing tiers (static, not mock)
```

Put mock data in a `mock/` subdirectory to make it obvious which data files are temporary placeholders and which are permanent static data.
