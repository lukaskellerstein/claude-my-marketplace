---
name: zasilkovna
description: >
  Integrate and manage Zásilkovna (Packeta) shipping for Czech and Slovak logistics.
  Create shipments, generate labels, track packages, manage pickup points, and configure
  webhooks using the Zásilkovna API. Covers both the REST API and SOAP API.
  Includes ready-to-run CLI scripts for all API operations.

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

## Ready-to-Use API Scripts

**IMPORTANT: Use the bundled CLI script for all API calls.** Do NOT construct raw XML or curl commands manually — use the wrapper script instead.

The script is located at: `${CLAUDE_PLUGIN_ROOT}/skills/zasilkovna/scripts/zasilkovna-api.sh`

### Prerequisites

Set the `ZASILKOVNA_API_KEY` environment variable before running any command:
```bash
export ZASILKOVNA_API_KEY="your-32-char-hex-api-password"
```

### Quick Reference — All Commands

```bash
SCRIPT="${CLAUDE_PLUGIN_ROOT}/skills/zasilkovna/scripts/zasilkovna-api.sh"
```

#### Packet Creation & Validation

```bash
# Create a packet (key=value pairs for all fields)
bash "$SCRIPT" create-packet \
  number=ORD-001 name=Jan surname=Novak \
  email=jan@example.com phone=+420777123456 \
  addressId=79 value=299.90 weight=1.5 eshop=MyShop

# Create with COD, currency, and dimensions
bash "$SCRIPT" create-packet \
  number=ORD-002 name=Eva surname=Svobodova \
  email=eva@example.com addressId=95 \
  value=599 weight=3 cod=599 currency=CZK \
  eshop=MyShop sizeLength=300 sizeWidth=200 sizeHeight=150

# Validate attributes without creating (same key=value syntax)
bash "$SCRIPT" validate-packet \
  number=ORD-003 name=Test surname=User \
  email=test@example.com addressId=79 value=100 weight=1

# Create a claim assistant packet
bash "$SCRIPT" create-packet-claim \
  number=CLM-001 value=200 email=customer@example.com

# Create claim with password
bash "$SCRIPT" create-packet-claim-with-password \
  number=CLM-002 value=200 email=customer@example.com consignCountry=CZ

# Create B2B packets
bash "$SCRIPT" create-packets-b2b 79 5 false
```

#### Packet Management

```bash
# Cancel a not-yet-submitted packet
bash "$SCRIPT" cancel-packet 1234567890

# Set storage deadline
bash "$SCRIPT" packet-set-stored-until 1234567890 2025-12-31

# Get storage deadline
bash "$SCRIPT" packet-get-stored-until 1234567890
```

#### Packet Information & Tracking

```bash
# Get packet info (branch, weight, courier details)
bash "$SCRIPT" packet-info 1234567890

# Get current status
bash "$SCRIPT" packet-status 1234567890

# Full internal tracking history
bash "$SCRIPT" packet-tracking 1234567890

# External carrier tracking history
bash "$SCRIPT" packet-courier-tracking 1234567890

# Get courier tracking number
bash "$SCRIPT" packet-courier-number 1234567890
```

#### Label Generation

```bash
# Download Packeta label as PDF
# Args: <packetId> [format] [offset] [outputFile]
# Formats: "A6 on A6", "A7 on A7", "A6 on A4", "A7 on A4", "105x35mm on A4", "A8 on A8"
bash "$SCRIPT" packet-label-pdf 1234567890 "A6 on A6" 0 label.pdf

# Download label in ZPL format (for thermal printers)
# Args: <packetId> [dpi: 203|300] [outputFile]
bash "$SCRIPT" packet-label-zpl 1234567890 300 label.zpl

# Multiple labels in one PDF
# Args: <outputFile> [format] [offset] <packetId1> <packetId2> ...
bash "$SCRIPT" packets-labels-pdf all-labels.pdf "A6 on A4" 0 \
  1234567890 1234567891 1234567892

# Generate barcode PNG (use Z-prefixed ID)
bash "$SCRIPT" barcode-png Z1234567890 barcode.png
```

#### Carrier Labels

```bash
# Download carrier label as PDF/PNG/ZPL
bash "$SCRIPT" packet-courier-label-pdf 1234567890 COURIER123 carrier.pdf
bash "$SCRIPT" packet-courier-label-png 1234567890 COURIER123 carrier.png
bash "$SCRIPT" packet-courier-label-zpl 1234567890 COURIER123 300 carrier.zpl

# Multiple carrier labels in one PDF
# Each packet as packetId:courierNumber
bash "$SCRIPT" packets-courier-labels-pdf carriers.pdf "A6 on A4" 0 \
  1234567890:COURIER123 1234567891:COURIER456
```

#### Shipments

```bash
# Create shipment from packet IDs (pass "" for no custom barcode)
bash "$SCRIPT" create-shipment "" 1234567890 1234567891

# Create shipment with custom barcode
bash "$SCRIPT" create-shipment MYBARCODE123 1234567890 1234567891

# Find packets in a shipment (by D-code or B-code)
bash "$SCRIPT" shipment-packets "D-XXX-XM-12345"
```

#### Other

```bash
# Get return routing strings for a sender
bash "$SCRIPT" sender-return-routing MySenderLabel
```

### create-packet Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `number` | **yes** | Unique order ID (1-36 alphanumeric) |
| `name` | **yes** | Recipient's first name |
| `surname` | **yes** | Recipient's surname |
| `email` | if no phone | Recipient's email |
| `phone` | if no email | Recipient's phone (include +420 prefix) |
| `addressId` | **yes** | Pickup point ID or carrier ID |
| `value` | **yes** | Declared value for insurance |
| `weight` | **yes** | Weight in kg |
| `eshop` | when multi-sender | Sender indication |
| `cod` | no | Cash on delivery amount |
| `currency` | no | CZK, EUR, HUF, PLN, RON |
| `company` | no | Recipient company name |
| `note` | no | Label note (max 128 chars) |
| `street` | home delivery | Street name |
| `houseNumber` | home delivery | House number |
| `city` | home delivery | City |
| `zip` | home delivery | ZIP code |
| `province` | no | Province |
| `adultContent` | no | 18+ ID check (0 or 1) |
| `deliverOn` | no | Scheduled delivery (YYYY-MM-DD, within 14 days) |
| `carrierService` | no | Comma-separated services (e.g., `signature`) |
| `customerBarcode` | no | Custom barcode (needs agreement) |
| `carrierPickupPoint` | some carriers | Carrier's pickup point code |
| `sizeLength` | some carriers | Length in mm |
| `sizeWidth` | some carriers | Width in mm |
| `sizeHeight` | some carriers | Height in mm |

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

### Creating a Shipment (using the script)

1. First validate the packet attributes:
   ```bash
   bash "$SCRIPT" validate-packet number=ORD-001 name=Jan surname=Novak ...
   ```
2. If validation succeeds, create the packet:
   ```bash
   bash "$SCRIPT" create-packet number=ORD-001 name=Jan surname=Novak ...
   ```
3. Generate the label:
   ```bash
   bash "$SCRIPT" packet-label-pdf <packetId> "A6 on A6" 0 label.pdf
   ```
4. When ready, create a shipment from one or more packets:
   ```bash
   bash "$SCRIPT" create-shipment "" <packetId1> <packetId2>
   ```

### Generating Labels

Labels can be generated in:
- **PDF** — standard A6, A7, A8 or on A4 paper
- **ZPL** — for thermal label printers (203 or 300 DPI)
- **Batch PDF** — multiple labels in one document

## Important

- Zásilkovna API key should never be committed to version control
- Always validate addresses and pickup point IDs before creating shipments
- Use the Packeta widget (`widget.packeta.com`) for customer-facing pickup point selection — do not build custom UI
- Czech phone numbers should include the +420 prefix
- COD (cash on delivery) requires additional fields: `cod` amount and `currency`
- Test environment is available — use test API keys for development
- For ZPL labels, the response is XML/HTML escaped — must unescape before printing
- Label format `offset` is 0-indexed, left-to-right, top-to-bottom on the page
