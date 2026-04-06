---
name: zasilkovna
description: >
  Integrate and manage Zásilkovna (Packeta) shipping for Czech and Slovak logistics.
  Create shipments, generate labels, track packages, manage pickup points, and configure
  webhooks using the Zásilkovna API. Covers both the REST API and SOAP API.

  <example>
  Context: User wants to set up Zásilkovna integration
  user: "integrate zásilkovna into my project"
  </example>

  <example>
  Context: User wants to create a shipment
  user: "create a zásilkovna shipment for this order"
  </example>

  <example>
  Context: User wants to find pickup points
  user: "list zásilkovna pickup points near Prague"
  </example>

  <example>
  Context: User wants to generate shipping labels
  user: "generate zásilkovna labels for today's orders"
  </example>

  <example>
  Context: User wants to track a package
  user: "track my zásilkovna package"
  </example>
---

# Zásilkovna (Packeta) Shipping Integration

Skill for integrating and managing Zásilkovna (Packeta) shipping services — the primary logistics provider for Czech and Slovak e-commerce.

## Capabilities

- **Shipment creation** — create packets via the Zásilkovna API (REST or SOAP)
- **Label generation** — generate and download shipping labels (PDF, ZPL)
- **Package tracking** — track shipment status and delivery updates
- **Pickup points** — query and display pickup point locations (Z-BOX, Z-POINT)
- **Webhook configuration** — set up status change notifications
- **Batch operations** — bulk shipment creation and label generation

## Detailed API Reference

For comprehensive API documentation, see the reference files:
- [API Getting Started](references/api-getting-started.md) — SOAP vs REST/XML, authentication, endpoint URLs, code examples
- [API Methods](references/api-methods.md) — all 24 API methods with prototypes, parameters, and XML examples
- [API Data Structures](references/api-data-structures.md) — all data structures with field types, constraints, and descriptions

## API Reference

### Authentication

Zásilkovna uses an API key (password) for authentication. The key is passed as a parameter in API requests.

- **REST API base URL:** `https://www.zasilkovna.cz/api/rest`
- **SOAP API WSDL:** `https://www.zasilkovna.cz/api/soap-php-bugfix.wsdl`
- **Widget for pickup points:** `https://widget.packeta.com/v6/`

### Key Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create packet | POST | `/packetAttributesValid` |
| Create shipment | POST | `/packetClaimAttributesValid` |
| Get tracking | GET | `/packetTracking` |
| Generate label | GET | `/packetsLabelsPdf` |
| List pickup points | GET | `/branch` |
| Packet status | GET | `/packetStatus` |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ZASILKOVNA_API_KEY` | Yes | API key (password) from Zásilkovna client section |
| `ZASILKOVNA_SENDER_ID` | Recommended | Default sender/branch ID for shipments |

## Workflow

### Setting Up Integration

1. **Check for existing integration** — look for Zásilkovna-related code, config, or packages
2. **Install SDK/client** — recommend official or well-maintained client library for the project's language
3. **Configure API credentials** — set up environment variables
4. **Implement core operations** — shipment creation, label generation, tracking
5. **Add pickup point widget** — integrate the Packeta widget for customer-facing pickup point selection
6. **Set up webhooks** — configure status change notifications

### Creating a Shipment

Required fields for packet creation:
- `number` — order/packet reference number
- `name`, `surname` — recipient name
- `email` — recipient email
- `phone` — recipient phone (with country prefix)
- `addressId` — pickup point ID (for pickup delivery)
- `value` — declared value (for COD)
- `weight` — package weight in kg
- `eshop` — e-shop identifier

### Generating Labels

Labels can be generated in:
- **PDF** — standard A4 or A6 format
- **ZPL** — for thermal label printers
- **Batch PDF** — multiple labels in one document

## Important

- Zásilkovna API key should never be committed to version control
- Always validate addresses and pickup point IDs before creating shipments
- Use the Packeta widget (`widget.packeta.com`) for customer-facing pickup point selection — do not build custom UI
- Czech phone numbers should include the +420 prefix
- COD (cash on delivery) requires additional fields: `cod` amount and `currency`
- Test environment is available — use test API keys for development
