---
name: stripe
description: >
  Integrate and manage Stripe payment processing — accept payments, manage subscriptions,
  generate invoices, handle refunds, and configure webhooks. Covers Stripe Checkout,
  Payment Intents, Subscriptions, Invoicing, and Connect.

  <example>
  Context: User wants to set up Stripe
  user: "integrate Stripe payments into my app"
  </example>

  <example>
  Context: User wants to create a checkout
  user: "add Stripe checkout to my product page"
  </example>

  <example>
  Context: User wants to set up subscriptions
  user: "set up Stripe subscriptions for my SaaS"
  </example>

  <example>
  Context: User wants to handle webhooks
  user: "set up Stripe webhook handling"
  </example>

  <example>
  Context: User wants to create an invoice
  user: "generate a Stripe invoice for this customer"
  </example>

  <example>
  Context: User wants to issue a refund
  user: "refund this Stripe payment"
  </example>
---

# Stripe Payment Processing

Skill for integrating and managing Stripe — the payment processing platform for accepting payments, managing subscriptions, invoicing, and financial operations.

## MCP Server

This plugin includes the **Stripe MCP server** (`mcp__plugin_company-plugin_stripe__*`) which provides AI-assisted tools for interacting with the Stripe API directly. Use it to:
- Create and manage customers, products, prices, and subscriptions
- Process payments and refunds
- Generate invoices
- Query account data and balances
- Troubleshoot integration issues

The MCP server runs locally via `npx @stripe/mcp@latest` and requires `STRIPE_SECRET_KEY`. Use test keys (`sk_test_...`) during development.

**Requires:** `STRIPE_SECRET_KEY` environment variable

## Capabilities

- **Payment processing** — one-time payments via Checkout, Payment Intents, or Charges
- **Subscriptions** — recurring billing with plans, trials, and usage-based pricing
- **Invoicing** — create, send, and manage invoices
- **Refunds** — full and partial refunds
- **Customer management** — create and manage customer records, payment methods
- **Webhook handling** — process Stripe events for payment confirmations, failures, subscription changes
- **Connect** — multi-party payments and marketplace payouts
- **Billing portal** — customer self-service for subscription management

## API Reference

### Authentication

Stripe uses API keys for authentication. Keys are passed via `Authorization: Bearer sk_...` header.

- **Base URL:** `https://api.stripe.com/v1`
- **Dashboard:** `https://dashboard.stripe.com`
- **Test mode prefix:** `sk_test_` / `pk_test_`
- **Live mode prefix:** `sk_live_` / `pk_live_`

### Key Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create checkout session | POST | `/checkout/sessions` |
| Create payment intent | POST | `/payment_intents` |
| Create customer | POST | `/customers` |
| Create subscription | POST | `/subscriptions` |
| Create invoice | POST | `/invoices` |
| Create refund | POST | `/refunds` |
| List payments | GET | `/payment_intents` |
| Get balance | GET | `/balance` |
| Create product | POST | `/products` |
| Create price | POST | `/prices` |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key for client-side (`pk_test_...` or `pk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook endpoint signing secret (`whsec_...`) |

## Workflow

### Setting Up Integration

1. **Check for existing integration** — look for Stripe-related code, packages, or config
2. **Install Stripe SDK** — `stripe` package for the project's language (Node.js, Python, Ruby, PHP, Go, Java, .NET)
3. **Configure API keys** — set up environment variables (test keys first)
4. **Create products and prices** — define what you're selling in Stripe
5. **Implement payment flow** — Checkout Session (simplest) or Payment Intents (custom)
6. **Set up webhooks** — handle payment confirmation, failures, subscription lifecycle
7. **Add billing portal** — let customers manage subscriptions and payment methods
8. **Test thoroughly** — use Stripe test cards and CLI for webhook testing

### Payment Flows

#### Stripe Checkout (Recommended for most cases)
Server creates a Checkout Session → redirect customer to Stripe-hosted page → handle success/cancel redirects + webhook.

#### Payment Intents (Custom UI)
Server creates Payment Intent → client confirms with Stripe.js + Elements → handle `payment_intent.succeeded` webhook.

#### Subscriptions
Create Customer → Create Subscription with Price → handle `invoice.paid` / `invoice.payment_failed` webhooks → provide Billing Portal for self-service.

### Webhook Events to Handle

| Event | When |
|-------|------|
| `checkout.session.completed` | Customer completed checkout |
| `payment_intent.succeeded` | Payment was successful |
| `payment_intent.payment_failed` | Payment failed |
| `invoice.paid` | Subscription invoice was paid |
| `invoice.payment_failed` | Subscription payment failed |
| `customer.subscription.updated` | Subscription changed (upgrade/downgrade/cancel) |
| `customer.subscription.deleted` | Subscription ended |

### Testing

- Use test API keys (`sk_test_...`) during development
- Test card numbers: `4242424242424242` (success), `4000000000000002` (decline)
- Use Stripe CLI for local webhook testing: `stripe listen --forward-to localhost:3000/webhook`
- Test subscription lifecycle: trials, renewals, cancellations, payment failures

## Important

- **Never expose secret keys** — `sk_*` keys must stay server-side and out of version control
- **Always verify webhooks** — use `stripe.webhooks.constructEvent()` with the signing secret
- **Use idempotency keys** — for POST requests to prevent duplicate charges
- **Handle SCA/3D Secure** — Payment Intents handle this automatically; don't use legacy Charges API for new integrations
- **Use test mode first** — always develop and test with `sk_test_` keys before going live
- **PCI compliance** — use Stripe.js/Elements or Checkout to avoid handling raw card data
- **Currency** — amounts are in the smallest currency unit (e.g., cents for USD, haléře for CZK)
- **Webhooks are essential** — never rely solely on client-side redirects for payment confirmation
