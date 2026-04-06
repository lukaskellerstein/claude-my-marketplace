# Standard Roles Reference

Paperclip supports these role types: `ceo`, `cto`, `cmo`, `cfo`, `engineer`, `designer`, `pm`, `qa`, `devops`, `researcher`, `general`. Each agent has a `role` (from this list) and a freeform `title` and `name`.

## Executive & Leadership

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| CEO | `ceo` | Chief Executive Officer | Strategy, goal decomposition, delegation, board communication, hiring proposals | — |
| CTO | `cto` | Chief Technology Officer | Technical architecture, engineering leadership, build-vs-buy decisions, code quality | CEO |
| CMO | `cmo` | Chief Marketing Officer | Brand strategy, marketing campaigns, content planning, SEO, customer acquisition | CEO |
| CFO | `cfo` | Chief Financial Officer | Financial planning, budgeting, cost analysis, pricing strategy, revenue forecasting | CEO |
| COO | `general` | Chief Operating Officer | Operations management, vendor relations, fulfillment logistics, process optimization | CEO |

## Engineering

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| BackendEngineer | `engineer` | Backend Engineer | API development, database design, payment integration, server-side logic | CTO |
| FrontendEngineer | `engineer` | Frontend Engineer | UI implementation, responsive design, component libraries, client-side state | CTO |
| FullstackEngineer | `engineer` | Fullstack Engineer | End-to-end feature development. For smaller teams without separate FE/BE | CTO |
| InfraEngineer | `devops` | Infrastructure Engineer | Docker, Kubernetes, Terraform, CI/CD pipelines, monitoring | CTO |
| MLEngineer | `engineer` | ML Engineer | ML pipelines, model training/serving, AI integrations, data preprocessing | CTO |
| DataEngineer | `engineer` | Data Engineer | ETL pipelines, data warehousing, analytics infrastructure | CTO |
| MobileEngineer | `engineer` | Mobile Engineer | iOS/Android development, React Native, mobile UX | CTO |
| SoftwareArchitect | `engineer` | Software Architect | System design, API contracts, technical decision records | CTO |

## Quality & Testing

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| QAEngineer | `qa` | QA Engineer | Test planning, automated testing, regression testing, bug reporting | CTO |
| UXTester | `qa` | UX Tester | User flow testing, accessibility audits, usability evaluation | CTO |
| SecurityEngineer | `engineer` | Security Engineer | Security audits, vulnerability scanning, compliance, secret management | CTO |

## Design & Creative

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| UIDesigner | `designer` | UI Designer | Visual design, component design, design system, mockups | CTO or CMO |
| UXDesigner | `designer` | UX Designer | User research, wireframing, information architecture, interaction design | CTO or CMO |
| ChiefDesigner | `designer` | Chief Designer | Design leadership, brand visual identity, design system strategy | CEO or CTO |
| GraphicDesigner | `designer` | Graphic Designer | Marketing visuals, social media graphics, presentation decks | CMO |

## Marketing & Content

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| ContentCreator | `general` | Content Creator | Blog posts, product descriptions, email copy, social media, SEO content | CMO |
| MarketingSpecialist | `general` | Marketing Specialist | Campaign execution, analytics, A/B testing, paid ads, conversion optimization | CMO |
| SocialMediaManager | `general` | Social Media Manager | Daily social media, community engagement, influencer outreach | CMO |
| SEOSpecialist | `researcher` | SEO Specialist | Keyword research, on-page optimization, link building, search analytics | CMO |

## Sales & Support

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| SalesRepresentative | `general` | Sales Representative | Lead qualification, outreach, demos, proposal writing, B2B sales | CEO or CMO |
| CustomerSupport | `general` | Customer Support | Ticket handling, customer inquiries, FAQ maintenance, escalation | COO or CEO |
| AccountManager | `general` | Account Manager | Client relationships, upselling, renewals, client success | CEO or CMO |

## Operations & Logistics

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| HeadOfOperations | `general` | Head of Operations | Vendor management, fulfillment SOP, shipping, quality assurance, cost optimization | CEO |
| WarehouseManager | `general` | Warehouse Manager | Inventory management, order fulfillment, packaging, shipping coordination | COO |
| SupplyChainManager | `general` | Supply Chain Manager | Supplier sourcing, procurement, lead time optimization, vendor evaluation | COO |

## Research & Strategy

| Name | Role | Title | Description | Reports to |
|------|------|-------|-------------|------------|
| ProductManager | `pm` | Product Manager | Product roadmap, feature prioritization, requirements, user stories | CEO or CTO |
| MarketResearcher | `researcher` | Market Researcher | Competitive analysis, market sizing, customer surveys, trend reports | CEO or CMO |
| DataAnalyst | `researcher` | Data Analyst | Business metrics, dashboards, reporting, data-driven insights | CEO or CFO |

## Typical Org Patterns

**Micro startup (3-4 agents):** CEO + CTO + FullstackEngineer (+ ContentCreator if marketing needed)

**Small tech company (5-7 agents):** CEO + CTO + BackendEngineer + FrontendEngineer + QAEngineer (+ CMO + ContentCreator)

**E-commerce company (8-10 agents):** CEO + CTO + BackendEngineer + FrontendEngineer + CMO + ContentCreator + HeadOfOperations + UIDesigner

**Full-service agency (10-12 agents):** CEO + CTO + BackendEngineer + FrontendEngineer + CMO + ContentCreator + UIDesigner + QAEngineer + InfraEngineer + ProductManager + CustomerSupport

## Budget Guidelines

| Level | Typical Range | Example |
|-------|--------------|---------|
| CEO | 5,000-15,000 cents/mo | $50-$150/mo |
| C-suite (CTO, CMO) | 8,000-20,000 | $80-$200/mo |
| Senior IC (architect, lead) | 10,000-25,000 | $100-$250/mo |
| IC (engineer, designer) | 5,000-15,000 | $50-$150/mo |
| Support roles (content, support) | 3,000-10,000 | $30-$100/mo |
