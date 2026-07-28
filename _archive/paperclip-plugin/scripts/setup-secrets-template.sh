#!/bin/bash
# =============================================================================
# Company Secrets Setup Script
# =============================================================================
# This script creates company-wide secrets via the Paperclip API.
# Secrets are injected into agent environments at runtime via .paperclip.yaml.
#
# Usage:
#   1. Fill in COMPANY_ID and AUTH_TOKEN after importing the company
#   2. Fill in the secret values your company needs (leave blank to skip)
#   3. Run: bash scripts/setup-secrets.sh
# =============================================================================

set -e

# === PAPERCLIP CONNECTION ===
PAPERCLIP_API_URL="http://localhost:3100"
COMPANY_ID=""           # Fill in after import
AUTH_TOKEN=""            # Fill in your auth token

# === SOURCE CODE & CI/CD ===
GH_TOKEN=""                     # GitHub personal access token for gh CLI

# === CONTAINER REGISTRY ===
DOCKER_HUB_USERNAME=""          # Docker Hub username
DOCKER_HUB_TOKEN=""             # Docker Hub access token

# === AI / MEDIA ===
GEMINI_API_KEY=""               # Google Gemini API key (image, video, music generation)
ELEVENLABS_API_KEY=""           # ElevenLabs API key (text-to-speech) — optional

# === PAYMENTS ===
STRIPE_SECRET_KEY=""            # Stripe secret API key (sk_test_... or sk_live_...)
STRIPE_WEBHOOK_SECRET=""        # Stripe webhook signing secret

# === COMMUNICATION ===
SLACK_WEBHOOK_URL=""            # Slack webhook for automated notifications

# =============================================================================
# === CREATE SECRETS (do not edit below) ===
# =============================================================================

if [ -z "$COMPANY_ID" ] || [ -z "$AUTH_TOKEN" ]; then
    echo "ERROR: COMPANY_ID and AUTH_TOKEN must be set"
    exit 1
fi

create_secret() {
    local name="$1" value="$2" description="$3"
    if [ -z "$value" ]; then
        echo "SKIP: $name (empty)"
        return
    fi
    response=$(curl -s -w "\n%{http_code}" -X POST "$PAPERCLIP_API_URL/api/companies/$COMPANY_ID/secrets" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$name\", \"value\": \"$value\", \"description\": \"$description\"}")
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -1)
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "  OK: $name"
    else
        echo "FAIL: $name (HTTP $http_code) $body"
    fi
}

echo "Creating secrets for company $COMPANY_ID..."
echo ""

# Source Code & CI/CD
create_secret "GH_TOKEN" "$GH_TOKEN" "GitHub personal access token for gh CLI"

# Container Registry
create_secret "DOCKER_HUB_USERNAME" "$DOCKER_HUB_USERNAME" "Docker Hub username"
create_secret "DOCKER_HUB_TOKEN" "$DOCKER_HUB_TOKEN" "Docker Hub access token"

# AI / Media
create_secret "GEMINI_API_KEY" "$GEMINI_API_KEY" "Google Gemini API key for media generation"
create_secret "ELEVENLABS_API_KEY" "$ELEVENLABS_API_KEY" "ElevenLabs API key for text-to-speech"

# Payments
create_secret "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" "Stripe secret API key"
create_secret "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET" "Stripe webhook signing secret"

# Communication
create_secret "SLACK_WEBHOOK_URL" "$SLACK_WEBHOOK_URL" "Slack webhook for notifications"

echo ""
echo "Done."

# === GOOGLE WORKSPACE ===
# GWS credentials are NOT managed via secrets API.
# Place your service account JSON at: .company/gws/<company-slug>.json (repo root)
# It is mounted into the container at /paperclip/.gws/<company-slug>.json
