# Packeta API - Methods Reference

Source: https://docs.packeta.com/docs/api-reference/api-methods

## General Notes

- All functions take **API password** as their first parameter (omitted from prototypes below)
- All methods can return `IncorrectApiPasswordFault` on invalid API password
- SOAP client init: `$client = new SoapClient("https://soap.api.packeta.com/api/soap-php-bugfix.wsdl");`
- REST: POST XML to `https://www.zasilkovna.cz/api/rest` with method name as root element

---

## Packet Creation & Validation

### createPacket()
- **Prototype**: `PacketIdDetail createPacket(PacketAttributes attributes)`
- **Description**: Creates a packet from PacketAttributes
- **Returns**: PacketIdDetail with new packet info (id, barcode, barcodeText)
- **Errors**: PacketAttributesFault
- **XML**: `<createPacket><apiPassword>...</apiPassword><packetAttributes>...</packetAttributes></createPacket>`

### createPacketClaim()
- **Prototype**: `PacketIdDetail createPacketClaim(ClaimAttributes attributes)`
- **Description**: Creates a claim assistant packet
- **Returns**: PacketIdDetail
- **Errors**: PacketAttributesFault

### createPacketClaimWithPassword()
- **Prototype**: `PacketDetail createPacketClaimWithPassword(ClaimWithPasswordAttributes attributes)`
- **Description**: Creates a claim assistant packet with password
- **Returns**: PacketDetail (includes id, barcode, barcodeText, password)
- **Errors**: PacketAttributesFault, PacketEmailNotFilled

### createPacketsB2B()
- **Prototype**: `CreatePacketsB2BResults createPacketsB2B(PacketB2BAttributes attributes)`
- **Description**: Creates B2B packets
- **Returns**: Array of PacketIdDetail
- **Errors**: IncorrectApiPasswordFault, PacketAttributesFault

### packetAttributesValid()
- **Prototype**: `void packetAttributesValid(PacketAttributes attributes)`
- **Description**: Validates PacketAttributes without creating a packet
- **Returns**: Nothing on success
- **Errors**: PacketAttributesFault

### packetClaimAttributesValid()
- **Prototype**: `void packetClaimAttributesValid(ClaimAttributes attributes)`
- **Description**: Validates ClaimAttributes without creating a packet
- **Returns**: Nothing on success
- **Errors**: PacketAttributesFault

---

## Packet Management

### cancelPacket()
- **Prototype**: `void cancelPacket(unsignedLong packetId)`
- **Description**: Cancels a not-yet-physically-submitted packet
- **Returns**: Nothing on success
- **Errors**: PacketIdFault, CancelNotAllowedFault

### packetSetStoredUntil()
- **Prototype**: `void packetSetStoredUntil(unsignedLong packetId, date date)`
- **Description**: Sets the storage deadline date for a packet (format: YYYY-MM-DD)
- **Returns**: Nothing on success
- **Errors**: PacketIdFault, DateOutOfRangeFault

### packetGetStoredUntil()
- **Prototype**: `NullableDate packetGetStoredUntil(unsignedLong packetId)`
- **Description**: Gets the date until which packet is stored for pick-up. Returns null if not ready or already returning.
- **Errors**: PacketIdFault

---

## Packet Information & Tracking

### packetInfo()
- **Prototype**: `PacketInfoResult packetInfo(unsignedLong packetId)`
- **Description**: Returns additional packet info and courier consignment details
- **Returns**: PacketInfoResult containing branchId, invoicedWeightGrams, courierInfo, number
- **Errors**: IncorrectApiPasswordFault
- **Note**: packetId is prefixed with Z (e.g., `Z1234567890`)

### packetStatus()
- **Prototype**: `CurrentStatusRecord packetStatus(unsignedLong packetId)`
- **Description**: Current status of the packet
- **Returns**: CurrentStatusRecord (extends StatusRecord with isReturning, storedUntil, carrierId, carrierName)
- **Errors**: PacketIdFault

### packetTracking()
- **Prototype**: `StatusRecords packetTracking(unsignedLong packetId)`
- **Description**: Full internal tracking history
- **Returns**: Array of StatusRecord
- **Errors**: PacketIdFault

### packetCourierTracking()
- **Prototype**: `ExternalStatusRecords packetCourierTracking(unsignedLong packetId)`
- **Description**: Full tracking history from external carrier
- **Returns**: Array of ExternalStatusRecord
- **Errors**: PacketIdFault

### packetCourierNumber() [DEPRECATED]
- **Prototype**: `string packetCourierNumber(unsignedLong packetId)`
- **Description**: Returns courier number (does not return full info for BDS)
- **Errors**: PacketIdFault, NotSupportedFault, ExternalGatewayFault

### packetCourierNumberV2()
- **Prototype**: `packetCourierNumberV2Result packetCourierNumberV2(unsignedLong packetId)`
- **Description**: Returns courier number, carrierId, and carrierName
- **Returns**: packetCourierNumberV2Result
- **Errors**: PacketIdFault, NotSupportedFault, ExternalGatewayFault

---

## Label Generation

### packetLabelPdf()
- **Prototype**: `binary packetLabelPdf(unsignedLong packetId, string format, unsignedInt offset)`
- **Description**: Fetches Packeta label as PDF
- **Format values**: `A6 on A6` (105x148mm), `A7 on A7` (105x74mm), `A6 on A4`, `A7 on A4`, `105x35mm on A4`, `A8 on A8` (50x74mm)
- **offset**: Position on page (left to right, top to bottom, 0-indexed)
- **Errors**: PacketIdFault, UnknownLabelFormatFault

### packetLabelZpl()
- **Prototype**: `binary packetLabelZpl(unsignedLong packetId, unsignedInt dpi)`
- **Description**: Fetches Packeta label in ZPL format
- **DPI values**: 203, 300 (some carriers support 203 only)
- **Returns**: XML/HTML escaped ZPL string (must unescape before printing)
- **Errors**: PacketIdFault, UnknownLabelFormatFault

### packetsLabelsPdf()
- **Prototype**: `binary packetsLabelsPdf(PacketIds packetIds, string format, unsignedInt offset)`
- **Description**: Fetches labels for multiple packets in one PDF
- **Errors**: PacketIdsFault, NoPacketIdsFault, UnknownLabelFormatFault

### barcodePng()
- **Prototype**: `binary barcodePng(string barcode)`
- **Description**: Returns PNG image of a Code 128 barcode
- **Note**: Use packetId prefixed with `Z` (e.g., `Z1234567890`)

---

## Carrier Labels

### packetCourierLabelPdf()
- **Prototype**: `binary packetCourierLabelPdf(unsignedLong packetId, string courierNumber)`
- **Description**: Returns carrier label as PDF (base64) -- only if carrier's `apiAllowed` is true
- **Errors**: PacketIdFault, NotSupportedFault, ExternalGatewayFault, InvalidCourierNumber

### packetCourierLabelPng()
- **Prototype**: `base64binary packetCourierLabelPng(unsignedLong packetId, string courierNumber)`
- **Description**: Returns carrier label as PNG (base64)
- **Errors**: PacketIdFault, NotSupportedFault, ExternalGatewayFault, InvalidCourierNumber

### packetCourierLabelZpl()
- **Prototype**: `string packetCourierLabelZpl(unsignedLong packetId, string courierNumber, unsignedInt dpi = 300)`
- **Description**: Returns carrier label in ZPL format (HTML/XML escaped -- must unescape)
- **DPI values**: 203, 300
- **Errors**: PacketIdFault, NotSupportedFault, ExternalGatewayFault, InvalidCourierNumber

### packetsCourierLabelsPdf()
- **Prototype**: `binary packetsCourierLabelsPdf(PacketIdsWithCourierNumbers packetIdsWithCourierNumbers, unsignedInt offset, string format)`
- **Description**: Returns multiple carrier labels in one PDF
- **Format values**: `A6 on A4` (default), `A6 on A6` (offset ignored)
- **Timeout recommendation**: 5 seconds per label (e.g., 120s for 24 labels)
- **Errors**: PacketIdFault, NotSupportedFault, ExternalGatewayFault, InvalidCourierNumber, NoPacketIdsFault, UnknownLabelFormatFault

---

## Shipments

### createShipment()
- **Prototype**: `ShipmentIdDetail createShipment(PacketIds packetIds, string customBarcode)`
- **Description**: Creates a shipment from packet IDs. Optional customBarcode if allowed for account.
- **Returns**: ShipmentIdDetail (id, barcode in format `D-***-XM-<id>`)
- **Note**: Does not accept already-consigned packets or claim assistant packets
- **Errors**: PacketIdsFault, NoPacketIdsFault, CustomBarcodeNotAllowedFault, ArgumentsFault

### shipmentPackets()
- **Prototype**: `ShipmentPacketsResult shipmentPackets(string shipmentId)`
- **Description**: Finds packets inside a shipment by D-code or B-code
- **Returns**: ShipmentPacketsResult (array of PacketIdDetail)
- **Errors**: ShipmentNotFoundFault

---

## Other

### senderGetReturnRouting()
- **Prototype**: `string[] senderGetReturnRouting(string senderLabel)`
- **Description**: Returns 2 return routing strings for a sender
- **Note**: Must be downloaded fresh each time (not cached) -- return address may change. Print each on separate line.
- **Errors**: SenderNotExists
