# Standard Roles Reference

Paperclip supports these role types: `ceo`, `cto`, `cmo`, `cfo`, `engineer`, `designer`, `pm`, `qa`, `devops`, `researcher`, `general`. Each agent has a `role` (from this list) and a freeform `title` and `name`.

Do NOT list `paperclip`, `paperclip-create-agent`, or `para-memory-files` in agents' `skills:` frontmatter — these are Paperclip built-ins available automatically at runtime, and listing them causes import warnings.

The "Recommended Skills" column lists **custom skills** that should be generated as `skills/<shortname>/SKILL.md` files, tailored to the company's domain. Only these custom skills go in the `skills:` frontmatter.

## Executive & Leadership

| Name | Role | Title | Description | Reports to | Recommended Skills |
|------|------|-------|-------------|------------|--------------------|
| CEO | `ceo` | Chief Executive Officer | Strategy, goal decomposition, delegation, board communication, hiring proposals | — | `strategy-review`, `delegation-playbook` |
| CTO | `cto` | Chief Technology Officer | Technical architecture, engineering leadership, build-vs-buy decisions, code quality | CEO | `architecture-review`, `tech-decisions` |
| CMO | `cmo` | Chief Marketing Officer | Brand strategy, marketing campaigns, content planning, SEO, customer acquisition | CEO | `campaign-planning`, `brand-voice` |
| CFO | `cfo` | Chief Financial Officer | Financial planning, budgeting, cost analysis, pricing strategy, revenue forecasting | CEO | `financial-analysis`, `pricing-model` |
| COO | `general` | Chief Operating Officer | Operations management, vendor relations, fulfillment logistics, process optimization | CEO | `vendor-evaluation`, `fulfillment-sop` |

## Engineering

| Name | Role | Title | Description | Reports to | Recommended Skills |
|------|------|-------|-------------|------------|--------------------|
| BackendEngineer | `engineer` | Backend Engineer | API development, database design, payment integration, server-side logic | CTO | `api-design`, `database-patterns` |
| FrontendEngineer | `engineer` | Frontend Engineer | UI implementation, responsive design, component libraries, client-side state | CTO | `component-patterns`, `accessibility` |
| FullstackEngineer | `engineer` | Fullstack Engineer | End-to-end feature development. For smaller teams without separate FE/BE | CTO | `api-design`, `component-patterns` |
| InfraEngineer | `devops` | Infrastructure Engineer | Docker, Kubernetes, Terraform, CI/CD pipelines, monitoring | CTO | `deployment-runbook`, `incident-response` |
| MLEngineer | `engineer` | ML Engineer | ML pipelines, model training/serving, AI integrations, data preprocessing | CTO | `ml-pipeline-guide`, `model-evaluation` |
| DataEngineer | `engineer` | Data Engineer | ETL pipelines, data warehousing, analytics infrastructure | CTO | `data-pipeline-guide`, `data-quality` |
| MobileEngineer | `engineer` | Mobile Engineer | iOS/Android development, React Native, mobile UX | CTO | `mobile-patterns`, `accessibility` |
| SoftwareArchitect | `engineer` | Software Architect | System design, API contracts, technical decision records | CTO | `architecture-review`, `adr-format` |

## Quality & Testing

| Name | Role | Title | Description | Reports to | Recommended Skills |
|------|------|-------|-------------|------------|--------------------|
| QAEngineer | `qa` | QA Engineer | Test planning, automated testing, regression testing, bug reporting | CTO | `test-strategy`, `bug-report-format` |
| UXTester | `qa` | UX Tester | User flow testing, accessibility audits, usability evaluation | CTO | `usability-checklist`, `accessibility` |
| SecurityEngineer | `engineer` | Security Engineer | Security audits, vulnerability scanning, compliance, secret management | CTO | `security-audit`, `owasp-checklist` |

## Design & Creative

| Name | Role | Title | Description | Reports to | Recommended Skills |
|------|------|-------|-------------|------------|--------------------|
| UIDesigner | `designer` | UI Designer | Visual design, component design, design system, mockups | CTO or CMO | `design-system`, `design-review` |
| UXDesigner | `designer` | UX Designer | User research, wireframing, information architecture, interaction design | CTO or CMO | `ux-research`, `usability-checklist` |
| ChiefDesigner | `designer` | Chief Designer | Design leadership, brand visual identity, design system strategy | CEO or CTO | `design-system`, `brand-voice` |
| GraphicDesigner | `designer` | Graphic Designer | Marketing visuals, social media graphics, presentation decks | CMO | `brand-voice`, `visual-assets-guide` |

## Marketing & Content

| Name | Role | Title | Description | Reports to | Recommended Skills |
|------|------|-------|-------------|------------|--------------------|
| ContentCreator | `general` | Content Creator | Blog posts, product descriptions, email copy, social media, SEO content | CMO | `content-style-guide`, `seo-checklist` |
| MarketingSpecialist | `general` | Marketing Specialist | Campaign execution, analytics, A/B testing, paid ads, conversion optimization | CMO | `campaign-planning`, `analytics-playbook` |
| SocialMediaManager | `general` | Social Media Manager | Daily social media, community engagement, influencer outreach | CMO | `social-media-playbook`, `brand-voice` |
| SEOSpecialist | `researcher` | SEO Specialist | Keyword research, on-page optimization, link building, search analytics | CMO | `seo-checklist`, `content-style-guide` |

## Sales & Support

| Name | Role | Title | Description | Reports to | Recommended Skills |
|------|------|-------|-------------|------------|--------------------|
| SalesRepresentative | `general` | Sales Representative | Lead qualification, outreach, demos, proposal writing, B2B sales | CEO or CMO | `sales-playbook`, `objection-handling` |
| CustomerSupport | `general` | Customer Support | Ticket handling, customer inquiries, FAQ maintenance, escalation | COO or CEO | `support-playbook`, `escalation-rules` |
| AccountManager | `general` | Account Manager | Client relationships, upselling, renewals, client success | CEO or CMO | `account-management`, `sales-playbook` |

## Operations & Logistics

| Name | Role | Title | Description | Reports to | Recommended Skills |
|------|------|-------|-------------|------------|--------------------|
| HeadOfOperations | `general` | Head of Operations | Vendor management, fulfillment SOP, shipping, quality assurance, cost optimization | CEO | `vendor-evaluation`, `fulfillment-sop` |
| WarehouseManager | `general` | Warehouse Manager | Inventory management, order fulfillment, packaging, shipping coordination | COO | `fulfillment-sop`, `inventory-management` |
| SupplyChainManager | `general` | Supply Chain Manager | Supplier sourcing, procurement, lead time optimization, vendor evaluation | COO | `vendor-evaluation`, `procurement-guide` |

## Research & Strategy

| Name | Role | Title | Description | Reports to | Recommended Skills |
|------|------|-------|-------------|------------|--------------------|
| ProductManager | `pm` | Product Manager | Product roadmap, feature prioritization, requirements, user stories | CEO or CTO | `prd-template`, `feature-prioritization` |
| MarketResearcher | `researcher` | Market Researcher | Competitive analysis, market sizing, customer surveys, trend reports | CEO or CMO | `research-methodology`, `competitive-analysis` |
| DataAnalyst | `researcher` | Data Analyst | Business metrics, dashboards, reporting, data-driven insights | CEO or CFO | `analytics-playbook`, `reporting-format` |

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
