---
name: dhl
description: >
  Integrate and manage DHL shipping for worldwide logistics.
  Create shipments, generate waybills, track packages, calculate rates, and manage
  returns using the DHL Express and DHL eCommerce APIs.

  <example>
  Context: User wants to set up DHL integration
  user: "integrate DHL shipping into my app"
  </example>

  <example>
  Context: User wants to create a shipment
  user: "create a DHL shipment to Germany"
  </example>

  <example>
  Context: User wants to track a package
  user: "track my DHL package"
  </example>

  <example>
  Context: User wants to calculate shipping rates
  user: "get DHL shipping rates for this package"
  </example>

  <example>
  Context: User wants to generate a waybill
  user: "generate DHL waybill for this order"
  </example>
---

# DHL Shipping Integration

Skill for integrating and managing DHL shipping services — worldwide parcel delivery, express shipping, and logistics.

## MCP Server

This plugin includes the **DHL API Assistant MCP server** (`mcp__plugin_company-plugin_dhl__*`) for AI-assisted DHL integration. The MCP server provides tools for:
- Shipment tracking (Unified)
- Parcel DE Shipping (Post & Parcel Germany)
- Parcel DE Private Shipping
- Parcel DE Returns

Use the MCP server tools for code completion, API integration, troubleshooting, and test case creation. The MCP server connects to the DHL sandbox — production migration requires switching credentials.

**Requires:** `DHL_API_KEY` environment variable (get one at [developer.dhl.com](https://developer.dhl.com))

## Capabilities

- **Shipment creation** — create shipments via DHL Express or eCommerce APIs
- **Waybill/label generation** — generate shipping labels and customs documents
- **Package tracking** — real-time tracking with detailed status events
- **Rate calculation** — get shipping quotes with delivery time estimates
- **Pickup scheduling** — schedule courier pickups
- **Return shipments** — create return labels and manage reverse logistics
- **Address validation** — verify delivery addresses before shipping

## API Reference

### DHL Express API (MyDHL API)

For express and international shipments.

- **Base URL:** `https://express.api.dhl.com/mydhlapi`
- **Test URL:** `https://express.api.dhl.com/mydhlapi/test`
- **Auth:** Basic Authentication (username + password)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create shipment | POST | `/shipments` |
| Track shipment | GET | `/tracking?trackingNumber={id}` |
| Get rates | POST | `/rates` |
| Schedule pickup | POST | `/pickups` |
| Create return | POST | `/shipments` (with `isCustomsDeclarable`) |
| Validate address | GET | `/address-validate` |
| Upload documents | PATCH | `/shipments/{id}/upload-image` |

### DHL Parcel / eCommerce API

For standard parcel shipping within Europe.

- **Base URL:** `https://api-eu.dhl.com`
- **Auth:** OAuth 2.0 (client credentials)

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create shipment | POST | `/parcel/de/shipping/v2/orders` |
| Get label | GET | `/parcel/de/shipping/v2/orders/{id}/label` |
| Track | GET | `/track/shipments?trackingNumber={id}` |
| Pickup | POST | `/parcel/de/shipping/v2/pickups` |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DHL_API_KEY` | Yes | DHL API key from developer portal |
| `DHL_API_SECRET` | Yes | DHL API secret |
| `DHL_ACCOUNT_NUMBER` | Yes | DHL account/shipper number |
| `DHL_ENV` | Recommended | `test` or `production` (defaults to `production`) |

## Workflow

### Setting Up Integration

1. **Check for existing integration** — look for DHL-related code, config, or packages
2. **Determine API tier** — DHL Express (international/express) vs DHL Parcel (European standard)
3. **Install SDK/client** — use official DHL SDK or HTTP client
4. **Configure credentials** — set up environment variables
5. **Implement core operations** — shipment creation, label generation, tracking
6. **Add rate calculator** — integrate rate quotes for checkout flow
7. **Set up webhooks** — configure tracking event notifications

### Creating a Shipment

Required fields:
- **Shipper** — name, address, city, postal code, country code, phone, email
- **Receiver** — name, address, city, postal code, country code, phone, email
- **Packages** — weight (kg), dimensions (cm: length x width x height)
- **Product code** — service type (e.g., `P` for Express Worldwide, `N` for Domestic Express)
- **Account number** — DHL account for billing

### International Shipments

For customs-declarable shipments, additional fields:
- `exportDeclaration` — item descriptions, quantities, values, HS codes
- `invoiceNumber` — commercial invoice reference
- `incoterm` — delivery terms (DAP, DDP, etc.)

## Important

- DHL credentials should never be committed to version control
- Always use the test environment (`DHL_ENV=test`) during development
- International shipments require customs declarations — validate completeness before submission
- Weight must be in kg, dimensions in cm
- DHL account numbers are typically 9-10 digits
- Rate quotes may differ from final charges — always display as estimates
- Track API has rate limits — cache tracking results for frequently-checked shipments
