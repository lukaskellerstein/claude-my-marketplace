#!/usr/bin/env bash
# =============================================================================
# zasilkovna-api.sh — Packeta/Zasilkovna REST API CLI wrapper
# =============================================================================
# All methods POST XML to the Packeta REST endpoint.
#
# Requires:
#   ZASILKOVNA_API_KEY  — 32-char hex API password
#
# Usage:
#   bash zasilkovna-api.sh <command> [args...]
#   bash zasilkovna-api.sh --help
#
# Examples:
#   bash zasilkovna-api.sh create-packet number=ORD123 name=John surname=Doe \
#     email=john@example.com phone=+420777123456 addressId=79 value=145.55 weight=2 eshop=MyEshop
#   bash zasilkovna-api.sh packet-status 1234567890
#   bash zasilkovna-api.sh packet-tracking 1234567890
#   bash zasilkovna-api.sh packet-label-pdf 1234567890 "A6 on A6" 0 label.pdf
# =============================================================================

set -euo pipefail

API_URL="https://www.zasilkovna.cz/api/rest"
API_KEY="${ZASILKOVNA_API_KEY:?Error: ZASILKOVNA_API_KEY environment variable is required}"

# ---------------------------------------------------------------------------
# Helper: POST XML to the API and return the response
# ---------------------------------------------------------------------------
call_api() {
  local xml="$1"
  curl -s -X POST -H "Content-Type: application/xml" -d "$xml" "$API_URL"
}

# ---------------------------------------------------------------------------
# Helper: POST XML to the API and save binary response to a file
# ---------------------------------------------------------------------------
call_api_binary() {
  local xml="$1"
  local output_file="$2"
  curl -s -X POST -H "Content-Type: application/xml" -d "$xml" "$API_URL" -o "$output_file"
  echo "Saved to $output_file"
}

# ---------------------------------------------------------------------------
# Helper: XML-escape a string
# ---------------------------------------------------------------------------
xml_escape() {
  local s="$1"
  s="${s//&/&amp;}"
  s="${s//</&lt;}"
  s="${s//>/&gt;}"
  s="${s//\"/&quot;}"
  s="${s//\'/&apos;}"
  echo "$s"
}

# =============================================================================
# PACKET CREATION & VALIDATION
# =============================================================================

# ---------------------------------------------------------------------------
# create-packet — Create a packet from PacketAttributes
# ---------------------------------------------------------------------------
# Usage: create-packet key=value [key=value ...]
#
# Required keys: number, name, surname, email|phone, addressId, value, weight
# Optional keys: eshop, cod, currency, company, note, street, houseNumber,
#   city, zip, province, adultContent, deliverOn, carrierService,
#   customerBarcode, carrierPickupPoint, sizeLength, sizeWidth, sizeHeight
#
# Returns: PacketIdDetail (id, barcode, barcodeText)
# ---------------------------------------------------------------------------
cmd_create_packet() {
  local -A attrs
  for arg in "$@"; do
    local key="${arg%%=*}"
    local val="${arg#*=}"
    attrs["$key"]="$(xml_escape "$val")"
  done

  # Build packetAttributes XML
  local fields=""
  for key in "${!attrs[@]}"; do
    case "$key" in
      sizeLength|sizeWidth|sizeHeight)
        ;; # handled separately as <size> element
      *)
        fields+="<${key}>${attrs[$key]}</${key}>"
        ;;
    esac
  done

  # Add <size> element if dimensions provided
  if [[ -n "${attrs[sizeLength]:-}" || -n "${attrs[sizeWidth]:-}" || -n "${attrs[sizeHeight]:-}" ]]; then
    fields+="<size>"
    [[ -n "${attrs[sizeLength]:-}" ]] && fields+="<length>${attrs[sizeLength]}</length>"
    [[ -n "${attrs[sizeWidth]:-}" ]] && fields+="<width>${attrs[sizeWidth]}</width>"
    [[ -n "${attrs[sizeHeight]:-}" ]] && fields+="<height>${attrs[sizeHeight]}</height>"
    fields+="</size>"
  fi

  local xml="<createPacket><apiPassword>${API_KEY}</apiPassword><packetAttributes>${fields}</packetAttributes></createPacket>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# validate-packet — Validate PacketAttributes without creating
# ---------------------------------------------------------------------------
# Usage: validate-packet key=value [key=value ...]
# Same keys as create-packet. Returns nothing on success, error on failure.
# ---------------------------------------------------------------------------
cmd_validate_packet() {
  local -A attrs
  for arg in "$@"; do
    local key="${arg%%=*}"
    local val="${arg#*=}"
    attrs["$key"]="$(xml_escape "$val")"
  done

  local fields=""
  for key in "${!attrs[@]}"; do
    case "$key" in
      sizeLength|sizeWidth|sizeHeight) ;;
      *) fields+="<${key}>${attrs[$key]}</${key}>" ;;
    esac
  done

  if [[ -n "${attrs[sizeLength]:-}" || -n "${attrs[sizeWidth]:-}" || -n "${attrs[sizeHeight]:-}" ]]; then
    fields+="<size>"
    [[ -n "${attrs[sizeLength]:-}" ]] && fields+="<length>${attrs[sizeLength]}</length>"
    [[ -n "${attrs[sizeWidth]:-}" ]] && fields+="<width>${attrs[sizeWidth]}</width>"
    [[ -n "${attrs[sizeHeight]:-}" ]] && fields+="<height>${attrs[sizeHeight]}</height>"
    fields+="</size>"
  fi

  local xml="<packetAttributesValid><apiPassword>${API_KEY}</apiPassword><packetAttributes>${fields}</packetAttributes></packetAttributesValid>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# create-packet-claim — Create a claim assistant packet
# ---------------------------------------------------------------------------
# Usage: create-packet-claim key=value [key=value ...]
# Required keys: number, value
# Optional keys: email, phone, currency, eshop, sendLabelToEmail
# Returns: PacketIdDetail
# ---------------------------------------------------------------------------
cmd_create_packet_claim() {
  local -A attrs
  for arg in "$@"; do
    local key="${arg%%=*}"
    local val="${arg#*=}"
    attrs["$key"]="$(xml_escape "$val")"
  done

  local fields=""
  for key in "${!attrs[@]}"; do
    fields+="<${key}>${attrs[$key]}</${key}>"
  done

  local xml="<createPacketClaim><apiPassword>${API_KEY}</apiPassword><claimAttributes>${fields}</claimAttributes></createPacketClaim>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# create-packet-claim-with-password — Create claim packet with password
# ---------------------------------------------------------------------------
# Usage: create-packet-claim-with-password key=value [key=value ...]
# Required keys: number, value
# Optional keys: email, phone, currency, eshop, sendLabelToEmail,
#   consignCountry, sendEmailToCustomer
# Returns: PacketDetail (includes password)
# ---------------------------------------------------------------------------
cmd_create_packet_claim_with_password() {
  local -A attrs
  for arg in "$@"; do
    local key="${arg%%=*}"
    local val="${arg#*=}"
    attrs["$key"]="$(xml_escape "$val")"
  done

  local fields=""
  for key in "${!attrs[@]}"; do
    fields+="<${key}>${attrs[$key]}</${key}>"
  done

  local xml="<createPacketClaimWithPassword><apiPassword>${API_KEY}</apiPassword><claimWithPasswordAttributes>${fields}</claimWithPasswordAttributes></createPacketClaimWithPassword>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# create-packets-b2b — Create B2B packets
# ---------------------------------------------------------------------------
# Usage: create-packets-b2b <addressId> [count] [isReturn]
# Returns: Array of PacketIdDetail
# ---------------------------------------------------------------------------
cmd_create_packets_b2b() {
  local address_id="${1:?Usage: create-packets-b2b <addressId> [count] [isReturn]}"
  local count="${2:-1}"
  local is_return="${3:-false}"

  local xml="<createPacketsB2B><apiPassword>${API_KEY}</apiPassword><packetB2BAttributes><addressId>${address_id}</addressId><count>${count}</count><isReturn>${is_return}</isReturn></packetB2BAttributes></createPacketsB2B>"
  call_api "$xml"
}

# =============================================================================
# PACKET MANAGEMENT
# =============================================================================

# ---------------------------------------------------------------------------
# cancel-packet — Cancel a not-yet-submitted packet
# ---------------------------------------------------------------------------
# Usage: cancel-packet <packetId>
# ---------------------------------------------------------------------------
cmd_cancel_packet() {
  local packet_id="${1:?Usage: cancel-packet <packetId>}"
  local xml="<cancelPacket><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId></cancelPacket>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# packet-set-stored-until — Set storage deadline for a packet
# ---------------------------------------------------------------------------
# Usage: packet-set-stored-until <packetId> <date>
# Date format: YYYY-MM-DD
# ---------------------------------------------------------------------------
cmd_packet_set_stored_until() {
  local packet_id="${1:?Usage: packet-set-stored-until <packetId> <YYYY-MM-DD>}"
  local date="${2:?Usage: packet-set-stored-until <packetId> <YYYY-MM-DD>}"
  local xml="<packetSetStoredUntil><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId><date>${date}</date></packetSetStoredUntil>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# packet-get-stored-until — Get storage deadline for a packet
# ---------------------------------------------------------------------------
# Usage: packet-get-stored-until <packetId>
# Returns: Date or null
# ---------------------------------------------------------------------------
cmd_packet_get_stored_until() {
  local packet_id="${1:?Usage: packet-get-stored-until <packetId>}"
  local xml="<packetGetStoredUntil><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId></packetGetStoredUntil>"
  call_api "$xml"
}

# =============================================================================
# PACKET INFORMATION & TRACKING
# =============================================================================

# ---------------------------------------------------------------------------
# packet-info — Get packet info and courier consignment details
# ---------------------------------------------------------------------------
# Usage: packet-info <packetId>
# Returns: PacketInfoResult (branchId, invoicedWeightGrams, courierInfo, number)
# ---------------------------------------------------------------------------
cmd_packet_info() {
  local packet_id="${1:?Usage: packet-info <packetId>}"
  local xml="<packetInfo><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId></packetInfo>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# packet-status — Get current packet status
# ---------------------------------------------------------------------------
# Usage: packet-status <packetId>
# Returns: CurrentStatusRecord (statusCode, codeText, statusText, isReturning, storedUntil, etc.)
# ---------------------------------------------------------------------------
cmd_packet_status() {
  local packet_id="${1:?Usage: packet-status <packetId>}"
  local xml="<packetStatus><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId></packetStatus>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# packet-tracking — Full internal tracking history
# ---------------------------------------------------------------------------
# Usage: packet-tracking <packetId>
# Returns: Array of StatusRecord
# ---------------------------------------------------------------------------
cmd_packet_tracking() {
  local packet_id="${1:?Usage: packet-tracking <packetId>}"
  local xml="<packetTracking><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId></packetTracking>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# packet-courier-tracking — Full tracking from external carrier
# ---------------------------------------------------------------------------
# Usage: packet-courier-tracking <packetId>
# Returns: Array of ExternalStatusRecord
# ---------------------------------------------------------------------------
cmd_packet_courier_tracking() {
  local packet_id="${1:?Usage: packet-courier-tracking <packetId>}"
  local xml="<packetCourierTracking><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId></packetCourierTracking>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# packet-courier-number — Get courier tracking number (v2)
# ---------------------------------------------------------------------------
# Usage: packet-courier-number <packetId>
# Returns: courierNumber, carrierId, carrierName
# ---------------------------------------------------------------------------
cmd_packet_courier_number() {
  local packet_id="${1:?Usage: packet-courier-number <packetId>}"
  local xml="<packetCourierNumberV2><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId></packetCourierNumberV2>"
  call_api "$xml"
}

# =============================================================================
# LABEL GENERATION
# =============================================================================

# ---------------------------------------------------------------------------
# packet-label-pdf — Download Packeta label as PDF
# ---------------------------------------------------------------------------
# Usage: packet-label-pdf <packetId> [format] [offset] [outputFile]
#
# Formats: "A6 on A6" (default), "A7 on A7", "A6 on A4", "A7 on A4",
#          "105x35mm on A4", "A8 on A8"
# Offset:  Position on page, 0-indexed (default: 0)
# Output:  File path (default: label-<packetId>.pdf)
# ---------------------------------------------------------------------------
cmd_packet_label_pdf() {
  local packet_id="${1:?Usage: packet-label-pdf <packetId> [format] [offset] [outputFile]}"
  local format="${2:-A6 on A6}"
  local offset="${3:-0}"
  local output_file="${4:-label-${packet_id}.pdf}"

  local xml="<packetLabelPdf><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId><format>$(xml_escape "$format")</format><offset>${offset}</offset></packetLabelPdf>"
  call_api_binary "$xml" "$output_file"
}

# ---------------------------------------------------------------------------
# packet-label-zpl — Download Packeta label in ZPL format
# ---------------------------------------------------------------------------
# Usage: packet-label-zpl <packetId> [dpi] [outputFile]
#
# DPI: 203 or 300 (default: 300)
# Output: File path (default: label-<packetId>.zpl)
# ---------------------------------------------------------------------------
cmd_packet_label_zpl() {
  local packet_id="${1:?Usage: packet-label-zpl <packetId> [dpi] [outputFile]}"
  local dpi="${2:-300}"
  local output_file="${3:-label-${packet_id}.zpl}"

  local xml="<packetLabelZpl><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId><dpi>${dpi}</dpi></packetLabelZpl>"
  call_api_binary "$xml" "$output_file"
}

# ---------------------------------------------------------------------------
# packets-labels-pdf — Download labels for multiple packets in one PDF
# ---------------------------------------------------------------------------
# Usage: packets-labels-pdf <outputFile> [format] [offset] <packetId1> <packetId2> ...
#
# Format: "A6 on A6" (default), "A7 on A7", "A6 on A4", "A7 on A4"
# Offset: 0-indexed position (default: 0)
# At least one packetId required
# ---------------------------------------------------------------------------
cmd_packets_labels_pdf() {
  local output_file="${1:?Usage: packets-labels-pdf <outputFile> [format] [offset] <id1> <id2> ...}"
  local format="${2:-A6 on A6}"
  local offset="${3:-0}"
  shift 3 || { echo "Error: at least one packet ID required"; exit 1; }

  local ids=""
  for id in "$@"; do
    ids+="<id>${id}</id>"
  done

  local xml="<packetsLabelsPdf><apiPassword>${API_KEY}</apiPassword><packetIds>${ids}</packetIds><format>$(xml_escape "$format")</format><offset>${offset}</offset></packetsLabelsPdf>"
  call_api_binary "$xml" "$output_file"
}

# ---------------------------------------------------------------------------
# barcode-png — Generate a barcode PNG image
# ---------------------------------------------------------------------------
# Usage: barcode-png <barcode> [outputFile]
#
# Barcode: packetId prefixed with Z (e.g., Z1234567890)
# Output: File path (default: barcode-<barcode>.png)
# ---------------------------------------------------------------------------
cmd_barcode_png() {
  local barcode="${1:?Usage: barcode-png <barcode> [outputFile]}"
  local output_file="${2:-barcode-${barcode}.png}"

  local xml="<barcodePng><apiPassword>${API_KEY}</apiPassword><barcode>${barcode}</barcode></barcodePng>"
  call_api_binary "$xml" "$output_file"
}

# =============================================================================
# CARRIER LABELS
# =============================================================================

# ---------------------------------------------------------------------------
# packet-courier-label-pdf — Download carrier label as PDF
# ---------------------------------------------------------------------------
# Usage: packet-courier-label-pdf <packetId> <courierNumber> [outputFile]
# ---------------------------------------------------------------------------
cmd_packet_courier_label_pdf() {
  local packet_id="${1:?Usage: packet-courier-label-pdf <packetId> <courierNumber> [outputFile]}"
  local courier_number="${2:?Usage: packet-courier-label-pdf <packetId> <courierNumber> [outputFile]}"
  local output_file="${3:-courier-label-${packet_id}.pdf}"

  local xml="<packetCourierLabelPdf><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId><courierNumber>${courier_number}</courierNumber></packetCourierLabelPdf>"
  call_api_binary "$xml" "$output_file"
}

# ---------------------------------------------------------------------------
# packet-courier-label-png — Download carrier label as PNG
# ---------------------------------------------------------------------------
# Usage: packet-courier-label-png <packetId> <courierNumber> [outputFile]
# ---------------------------------------------------------------------------
cmd_packet_courier_label_png() {
  local packet_id="${1:?Usage: packet-courier-label-png <packetId> <courierNumber> [outputFile]}"
  local courier_number="${2:?Usage: packet-courier-label-png <packetId> <courierNumber> [outputFile]}"
  local output_file="${3:-courier-label-${packet_id}.png}"

  local xml="<packetCourierLabelPng><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId><courierNumber>${courier_number}</courierNumber></packetCourierLabelPng>"
  call_api_binary "$xml" "$output_file"
}

# ---------------------------------------------------------------------------
# packet-courier-label-zpl — Download carrier label in ZPL format
# ---------------------------------------------------------------------------
# Usage: packet-courier-label-zpl <packetId> <courierNumber> [dpi] [outputFile]
# DPI: 203 or 300 (default: 300)
# ---------------------------------------------------------------------------
cmd_packet_courier_label_zpl() {
  local packet_id="${1:?Usage: packet-courier-label-zpl <packetId> <courierNumber> [dpi] [outputFile]}"
  local courier_number="${2:?Usage: packet-courier-label-zpl <packetId> <courierNumber> [dpi] [outputFile]}"
  local dpi="${3:-300}"
  local output_file="${4:-courier-label-${packet_id}.zpl}"

  local xml="<packetCourierLabelZpl><apiPassword>${API_KEY}</apiPassword><packetId>${packet_id}</packetId><courierNumber>${courier_number}</courierNumber><dpi>${dpi}</dpi></packetCourierLabelZpl>"
  call_api_binary "$xml" "$output_file"
}

# ---------------------------------------------------------------------------
# packets-courier-labels-pdf — Download multiple carrier labels in one PDF
# ---------------------------------------------------------------------------
# Usage: packets-courier-labels-pdf <outputFile> [format] [offset] <packetId:courierNumber> ...
#
# Format: "A6 on A4" (default), "A6 on A6"
# Each packet specified as packetId:courierNumber
# ---------------------------------------------------------------------------
cmd_packets_courier_labels_pdf() {
  local output_file="${1:?Usage: packets-courier-labels-pdf <outputFile> [format] [offset] <id:courier> ...}"
  local format="${2:-A6 on A4}"
  local offset="${3:-0}"
  shift 3 || { echo "Error: at least one packetId:courierNumber pair required"; exit 1; }

  local items=""
  for pair in "$@"; do
    local pid="${pair%%:*}"
    local cnum="${pair#*:}"
    items+="<packetIdWithCourierNumber><packetId>${pid}</packetId><courierNumber>${cnum}</courierNumber></packetIdWithCourierNumber>"
  done

  local xml="<packetsCourierLabelsPdf><apiPassword>${API_KEY}</apiPassword><packetIdsWithCourierNumbers>${items}</packetIdsWithCourierNumbers><offset>${offset}</offset><format>$(xml_escape "$format")</format></packetsCourierLabelsPdf>"
  call_api_binary "$xml" "$output_file"
}

# =============================================================================
# SHIPMENTS
# =============================================================================

# ---------------------------------------------------------------------------
# create-shipment — Create a shipment from packet IDs
# ---------------------------------------------------------------------------
# Usage: create-shipment [customBarcode] <packetId1> <packetId2> ...
#
# customBarcode: optional, pass "" to skip
# Returns: ShipmentIdDetail (id, barcode)
# ---------------------------------------------------------------------------
cmd_create_shipment() {
  local custom_barcode="${1:-}"
  shift || { echo "Error: at least one packet ID required"; exit 1; }

  local ids=""
  for id in "$@"; do
    ids+="<id>${id}</id>"
  done

  local barcode_xml=""
  if [[ -n "$custom_barcode" ]]; then
    barcode_xml="<customBarcode>${custom_barcode}</customBarcode>"
  fi

  local xml="<createShipment><apiPassword>${API_KEY}</apiPassword><packetIds>${ids}</packetIds>${barcode_xml}</createShipment>"
  call_api "$xml"
}

# ---------------------------------------------------------------------------
# shipment-packets — Find packets in a shipment
# ---------------------------------------------------------------------------
# Usage: shipment-packets <shipmentId>
# shipmentId: D-code or B-code
# Returns: Array of PacketIdDetail
# ---------------------------------------------------------------------------
cmd_shipment_packets() {
  local shipment_id="${1:?Usage: shipment-packets <shipmentId>}"
  local xml="<shipmentPackets><apiPassword>${API_KEY}</apiPassword><shipmentId>${shipment_id}</shipmentId></shipmentPackets>"
  call_api "$xml"
}

# =============================================================================
# OTHER
# =============================================================================

# ---------------------------------------------------------------------------
# sender-return-routing — Get return routing strings for a sender
# ---------------------------------------------------------------------------
# Usage: sender-return-routing <senderLabel>
# Returns: 2 routing strings (print each on a separate line)
# ---------------------------------------------------------------------------
cmd_sender_return_routing() {
  local sender_label="${1:?Usage: sender-return-routing <senderLabel>}"
  local xml="<senderGetReturnRouting><apiPassword>${API_KEY}</apiPassword><senderLabel>${sender_label}</senderLabel></senderGetReturnRouting>"
  call_api "$xml"
}

# =============================================================================
# HELP & DISPATCH
# =============================================================================

show_help() {
  cat <<'HELP'
Zasilkovna/Packeta REST API CLI Wrapper

USAGE:
  bash zasilkovna-api.sh <command> [args...]

REQUIRES:
  ZASILKOVNA_API_KEY environment variable (32-char hex string)

COMMANDS:
  Packet Creation & Validation:
    create-packet <key=value ...>         Create a packet
    validate-packet <key=value ...>       Validate attributes without creating
    create-packet-claim <key=value ...>   Create a claim assistant packet
    create-packet-claim-with-password     Create claim with password
    create-packets-b2b <addressId> [count] [isReturn]

  Packet Management:
    cancel-packet <packetId>              Cancel a not-yet-submitted packet
    packet-set-stored-until <id> <date>   Set storage deadline (YYYY-MM-DD)
    packet-get-stored-until <id>          Get storage deadline

  Packet Information & Tracking:
    packet-info <packetId>                Get packet info + courier details
    packet-status <packetId>              Get current status
    packet-tracking <packetId>            Full internal tracking history
    packet-courier-tracking <packetId>    Full external carrier tracking
    packet-courier-number <packetId>      Get courier tracking number

  Label Generation:
    packet-label-pdf <id> [fmt] [offset] [output]    Packeta label as PDF
    packet-label-zpl <id> [dpi] [output]             Packeta label as ZPL
    packets-labels-pdf <output> [fmt] [offset] <ids...>  Multiple labels PDF
    barcode-png <barcode> [output]                    Barcode PNG image

  Carrier Labels:
    packet-courier-label-pdf <id> <courier> [output]     Carrier label PDF
    packet-courier-label-png <id> <courier> [output]     Carrier label PNG
    packet-courier-label-zpl <id> <courier> [dpi] [out]  Carrier label ZPL
    packets-courier-labels-pdf <out> [fmt] [off] <id:courier ...>

  Shipments:
    create-shipment [customBarcode] <packetId ...>   Create a shipment
    shipment-packets <shipmentId>                    Find packets in shipment

  Other:
    sender-return-routing <senderLabel>   Get return routing strings

EXAMPLES:
  # Create a packet
  bash zasilkovna-api.sh create-packet \
    number=ORD-001 name=Jan surname=Novak \
    email=jan@example.com phone=+420777123456 \
    addressId=79 value=299.90 weight=1.5 eshop=MyShop

  # Create with COD and dimensions
  bash zasilkovna-api.sh create-packet \
    number=ORD-002 name=Eva surname=Svobodova \
    email=eva@example.com addressId=95 \
    value=599 weight=3 cod=599 currency=CZK \
    eshop=MyShop sizeLength=300 sizeWidth=200 sizeHeight=150

  # Validate before creating
  bash zasilkovna-api.sh validate-packet \
    number=ORD-003 name=Test surname=User \
    email=test@example.com addressId=79 value=100 weight=1

  # Check packet status
  bash zasilkovna-api.sh packet-status 1234567890

  # Full tracking history
  bash zasilkovna-api.sh packet-tracking 1234567890

  # Download label
  bash zasilkovna-api.sh packet-label-pdf 1234567890 "A6 on A6" 0 label.pdf

  # Multiple labels in one PDF
  bash zasilkovna-api.sh packets-labels-pdf all-labels.pdf "A6 on A4" 0 \
    1234567890 1234567891 1234567892

  # Create shipment from packets
  bash zasilkovna-api.sh create-shipment "" 1234567890 1234567891

  # Cancel a packet
  bash zasilkovna-api.sh cancel-packet 1234567890
HELP
}

# Dispatch
command="${1:---help}"
shift || true

case "$command" in
  create-packet)                     cmd_create_packet "$@" ;;
  validate-packet)                   cmd_validate_packet "$@" ;;
  create-packet-claim)               cmd_create_packet_claim "$@" ;;
  create-packet-claim-with-password) cmd_create_packet_claim_with_password "$@" ;;
  create-packets-b2b)                cmd_create_packets_b2b "$@" ;;
  cancel-packet)                     cmd_cancel_packet "$@" ;;
  packet-set-stored-until)           cmd_packet_set_stored_until "$@" ;;
  packet-get-stored-until)           cmd_packet_get_stored_until "$@" ;;
  packet-info)                       cmd_packet_info "$@" ;;
  packet-status)                     cmd_packet_status "$@" ;;
  packet-tracking)                   cmd_packet_tracking "$@" ;;
  packet-courier-tracking)           cmd_packet_courier_tracking "$@" ;;
  packet-courier-number)             cmd_packet_courier_number "$@" ;;
  packet-label-pdf)                  cmd_packet_label_pdf "$@" ;;
  packet-label-zpl)                  cmd_packet_label_zpl "$@" ;;
  packets-labels-pdf)                cmd_packets_labels_pdf "$@" ;;
  barcode-png)                       cmd_barcode_png "$@" ;;
  packet-courier-label-pdf)          cmd_packet_courier_label_pdf "$@" ;;
  packet-courier-label-png)          cmd_packet_courier_label_png "$@" ;;
  packet-courier-label-zpl)          cmd_packet_courier_label_zpl "$@" ;;
  packets-courier-labels-pdf)        cmd_packets_courier_labels_pdf "$@" ;;
  create-shipment)                   cmd_create_shipment "$@" ;;
  shipment-packets)                  cmd_shipment_packets "$@" ;;
  sender-return-routing)             cmd_sender_return_routing "$@" ;;
  --help|-h|help)                    show_help ;;
  *)
    echo "Error: Unknown command '$command'"
    echo "Run 'bash zasilkovna-api.sh --help' for usage."
    exit 1
    ;;
esac
