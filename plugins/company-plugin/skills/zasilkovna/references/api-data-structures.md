# Packeta API - Data Structures Reference

Source: https://docs.packeta.com/docs/api-reference/data-structures

---

## PacketAttributes (main packet creation structure)

| Type | Field | Constraints | Required | Description |
|------|-------|-------------|----------|-------------|
| unsignedLong | id | 10 digits | no | deprecated |
| string | affiliateId | 16 alphanumeric | no | Third-party sender or affiliate ID |
| string | number | 1-36 alphanumeric | **yes** | Unique order ID from e-shop |
| string | name | 1-32 (regex `/^[\p{L}\p{N} ,.'\\-&()]+$/ui`) | **yes** | Recipient's name |
| string | surname | 1-32 (same regex) | **yes** | Recipient's surname |
| string | company | 1-32 alphanumeric | no | Recipient's company |
| string | email | valid email | if no phone | Recipient's email |
| string | phone | valid phone | if no email | Recipient's phone |
| unsignedInt | addressId | valid active branch ID | **yes** | Branch ID or external carrier ID |
| string | currency | CZK, EUR, HUF, PLN, RON | no | Currency of COD and value |
| decimal | cod | up to 2 decimal, whole for CZK, multiple of 5 for HUF | no | Cash on delivery amount |
| decimal | value | see TOS max values | **yes** | Packet value for insurance |
| decimal | weight | - | **yes** | Weight in kg |
| date | deliverOn | within next 14 days | no | Scheduled delivery date (YYYY-MM-DD) |
| string | eshop | - | when using more senders | Sender indication |
| boolean | adultContent | 0-1 | no | 18+ ID check (CZ/SK/HU/RO internal points only) |
| string | note | 1-128 (no `"` or `;`) | no | Label note (max 32 chars for some carriers) |
| string | street | 1-32 | on home delivery | Street |
| string | houseNumber | 1-16 | on home delivery | House number |
| string | city | 1-32 | on home delivery | City |
| string | province | 1-32 | no | Province |
| string | zip | valid ZIP | on home delivery | ZIP code |
| string | carrierService | comma-separated | no | Carrier services (see Carrier Service) |
| string | customerBarcode | 1-32 | no | Custom barcode (needs agreement) |
| string | carrierPickupPoint | 1-32 | yes for some carriers | Carrier's pick up point code |
| CustomsDeclaration | customsDeclaration | deprecated | on HD outside EU | Use attributes and items instead |
| Size | size | - | yes for some carriers | Packet dimensions |
| AttributeCollection | attributes | - | yes for some carriers | Additional carrier-specific info |
| ItemCollection | items | - | yes for some carriers | Packet contents for customs |
| Security | security | - | no | Security options |
| Services | services | - | no | Additional services (reserved for future) |
| RoLogisticsTaxDeclaration | roLogisticsTaxDeclaration | - | no | Romanian logistics tax |

---

## ClaimAttributes

| Type | Field | Constraints | Required | Description |
|------|-------|-------------|----------|-------------|
| unsignedLong | id | 10 digits | no | deprecated |
| string | number | 1-36 alphanumeric | **yes** | Unique order ID |
| string | email | valid email | no | Customer email |
| string | phone | valid phone | no | Customer phone |
| decimal | value | see TOS | **yes** | Packet value |
| string | currency | CZK, EUR, HUF, PLN, RON | no | Currency |
| string | eshop | - | when using more senders | Sender indication |
| bool | sendLabelToEmail | - | no | Send PDF label to customer (makes email required) |
| Security | security | - | no | Security options |

---

## ClaimWithPasswordAttributes

Same as ClaimAttributes plus:

| Type | Field | Constraints | Required | Description |
|------|-------|-------------|----------|-------------|
| string | consignCountry | 2 alpha | no | Consign country / notification language |
| bool | sendEmailToCustomer | - | no | Send password email (makes email + consignCountry required) |

---

## Response Structures

### PacketIdDetail
| Type | Field | Description |
|------|-------|-------------|
| unsignedLong | id | 10-digit unique packet ID |
| string | barcode | ID prefixed with 'Z' (e.g., Z1234567890) |
| string | barcodeText | Formatted: `Z 123 4567 890` |

### PacketDetail (extends PacketIdDetail)
| Type | Field | Description |
|------|-------|-------------|
| unsignedLong | id | Unique packet ID |
| string | barcode | Z-prefixed ID |
| string | barcodeText | Formatted barcode |
| string | password | Password for submitting packet |

### PacketInfoResult
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| unsignedInt | branchId | yes | Destination branch ID |
| unsignedInt | invoicedWeightGrams | no | Verified/invoiced weight |
| CourierInfo | courierInfo | no | Courier consignment info |
| string | number | no | Order ID (claims: original barcode with RET prefix) |

### ShipmentIdDetail
| Type | Field | Description |
|------|-------|-------------|
| unsignedInt | id | Unique shipment ID |
| string | checksum | Empty string (deprecated) |
| string | barcode | Format: `D-***-XM-<id>` |
| string | barcodeText | Same as barcode (deprecated) |

### ShipmentPacketsResult
| Type | Field | Description |
|------|-------|-------------|
| PacketCollection | packets | Array of PacketIdDetail |

---

## Tracking Structures

### StatusRecord
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| dateTime | dateTime | yes | Status change time (`Y-m-d\TH:i:s`) |
| unsignedInt | statusCode | yes | Integer status code |
| string | codeText | yes | Text code representation |
| string | statusText | yes | Status description |
| unsignedInt | branchId | yes | Position at status change (0 if unavailable) |
| unsignedInt | destinationBranchId | yes | Destination branch (0 if not relevant) |
| string | externalTrackingCode | no | External carrier tracking code |

### CurrentStatusRecord (extends StatusRecord)
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| ... | ... | ... | All StatusRecord fields |
| boolean | isReturning | yes | Whether packet is returning to sender |
| date | storedUntil | yes | Last pick-up day before return |
| unsignedInt | carrierId | no | Carrier method identifier |
| string | carrierName | no | Carrier method name (English) |

### ExternalStatusRecord
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| dateTime | dateTime | yes | Status change time |
| string | carrierClass | yes | External carrier identifier (e.g., `czpacketahome`) |
| string | statusCode | yes | Carrier status code (text) |
| string | externalStatusName | yes | Status description |
| string | externalNote | no | Additional note |
| string | externalTrackingCode | no | Carrier tracking code |

### StatusRecords
Array of StatusRecord.

### ExternalStatusRecords
Array of ExternalStatusRecord.

---

## Courier Info Structures

### CourierInfoItem
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| unsignedInt | courierId | yes | Courier ID |
| string | courierName | yes | Courier name |
| CourierNumbers | courierNumbers | no | External courier numbers |
| CourierBarcodes | courierBarcodes | no | Barcodes from carrier label |
| CourierTrackingNumbers | courierTrackingNumbers | no | Tracking numbers |
| CourierTrackingUrls | courierTrackingUrls | no | Tracking URLs |

### CourierInfo
Array of CourierInfoItem.

### CourierNumbers
Array of `courierNumber` (string).

### CourierBarcodes
Array of `courierBarcode` (string).

### CourierTrackingNumbers
Array of `courierTrackingNumber` (string).

### CourierTrackingUrl
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| string | lang | yes | 2-letter language code |
| string | url | yes | Tracking URL |

### CourierTrackingUrls
Array of CourierTrackingUrl.

### PacketCourierNumberV2Result
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| string | courierNumber | yes | Courier's number |
| unsignedInt | carrierId | no | Carrier method ID |
| string | carrierName | no | Carrier method name (English) |

---

## B2B Structure

### PacketB2BAttributes
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| integer | addressId | yes | Destination Pickup Point ID |
| integer | count | no | Count of packets (default 1) |
| boolean | isReturn | no | Whether packet is return (default false) |

---

## Helper Structures

### PacketIds
Array of unsignedLong packet IDs.

### PacketIdWithCourierNumber
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| unsignedLong | packetId | yes | Packet ID |
| string | courierNumber | yes | Courier number |

### PacketIdsWithCourierNumbers
Array of PacketIdWithCourierNumber.

### PacketCollection
Array of PacketIdDetail.

### Size (dimensions in mm)
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| unsignedInt | length | yes | Length |
| unsignedInt | width | yes | Width |
| unsignedInt | height | yes | Height |

### NullableDate
A date field that can be null.

### Security
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| boolean | allowPublicTracking | no | Allow public tracking |
| AllowTrackingForUsers | allowTrackingForUsers | no | Allow specific users to track |

### AllowTrackingForUsers
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| ApiKeys | apiKeys | yes | Packet collection |

### ApiKeys
Array of `apiKey` objects containing a 16-character string API key.

### Attribute
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| string | key | yes | Property name |
| string | value | yes | Property value |

### AttributeCollection
Array of Attribute.

### Item
Represents one kind of thing in the packet. Array of Attribute.

### ItemCollection
Array of Item.

---

## Services (reserved for future use)

### Services
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| FirstMileCarrierService | firstMileCarrier | no | External carrier delivering to Packeta network |
| LastMileCarrierService | lastMileCarrier | no | External carrier delivering to client |
| ReturnDestinationService | returnDestination | no | Override default return address |

### FirstMileCarrierService / LastMileCarrierService
| Type | Field | Constraints | Required | Description |
|------|-------|-------------|----------|-------------|
| unsignedInt | addressId | - | yes | External carrier ID |
| string | barcode | maxLength=64 | no | Packet barcode |
| string | trackingCode | maxLength=64 | no | Tracking code |
| string | foreignId | maxLength=64 | no | Foreign ID for carrier API |

### ReturnDestinationService
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| unsignedInt | addressId | yes | Branch or carrier ID |
| string | carrierPickupPoint | no | Pick-up point ID |
| ReturnDestinationServiceAddress | returnAddress | no | Return address (required for HD/box) |
| ReturnDestinationServiceClient | client | no | Client info for return |

### RoLogisticsTaxDeclaration
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| boolean | isSubjectToTax | no | Romanian tax per law 1.1.2026 for packets <=150 EUR |
| string | countryOfOrigin | if isSubjectToTax=true | ISO 3166-1 alpha-2 country code |

---

## Carrier Services (carrierService field values)

| Service | Carriers | Description |
|---------|----------|-------------|
| signature | frcolissimohome, frcolisprivehome | Recipient must sign upon delivery |
| additionalInsurance | frcolissimohome | Additional insurance per pricelist |
| open | bgspeedyhome | Recipient can open package before payment |
| test | bgspeedyhome | Recipient can test contents before payment |

Format: lowercase, comma-separated, no whitespace. Example: `service1,service2,service3`

---

## CustomsDeclaration (DEPRECATED - use attributes and items)

| Type | Field | Required | Description |
|------|-------|----------|-------------|
| decimal | deliveryCostEur | yes | Shipping cost in EUR |
| decimal | deliveryCost | yes | Shipping cost in destination currency |
| CustomsDeclarationItems | items | yes | Array of CustomsDeclarationItem |

### CustomsDeclarationItem (DEPRECATED)
| Type | Field | Required | Description |
|------|-------|----------|-------------|
| string | customsCode | yes | HS tariff code |
| decimal | valueEur | yes | Product value in EUR |
| decimal | value | yes | Product value in destination currency |
| string | ean | yes | EAN code |
| string | productNameEn | yes | Product name (English) |
| string | productName | yes | Product name (destination language) |
| unsignedInt | unitsCount | yes | Number of units |
| string | countryOfOrigin | yes | Country of origin |
| string | currency | no | Currency (required by Swiss Post) |
| string | invoiceNumber | no | Invoice number (required by Swiss Post) |
| date | invoiceIssueDate | no | Invoice date Y-m-d (required by Swiss Post) |
| unsignedInt | weight | no | Weight in grams (required by Swiss Post) |
| boolean | isFoodBook | no | Food or book? (required by Swiss Post) |
| boolean | isVoc | no | Volatile Organic Compound? (required by Swiss Post) |
