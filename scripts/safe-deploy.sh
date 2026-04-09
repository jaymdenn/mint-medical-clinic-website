#!/bin/bash

# Safe Deploy Script for Mint Medical Clinic
# This script verifies the correct Netlify site before deploying

EXPECTED_SITE_ID="38e7c65c-9693-4bec-9e83-e2312bd923db"
EXPECTED_SITE_NAME="mint-medical-clinic"
EXPECTED_URL="https://www.mintmedicalclinic.com"

echo "============================================"
echo "  MINT MEDICAL CLINIC - SAFE DEPLOY SCRIPT"
echo "============================================"
echo ""

# Check Netlify status
echo "Checking Netlify site configuration..."
SITE_INFO=$(netlify status 2>/dev/null)

# Extract site ID
CURRENT_SITE_ID=$(echo "$SITE_INFO" | grep "Project Id:" | awk '{print $3}')
CURRENT_SITE_NAME=$(echo "$SITE_INFO" | grep "Current project:" | awk '{print $3}')

echo ""
echo "Current Site ID: $CURRENT_SITE_ID"
echo "Expected Site ID: $EXPECTED_SITE_ID"
echo ""
echo "Current Site Name: $CURRENT_SITE_NAME"
echo "Expected Site Name: $EXPECTED_SITE_NAME"
echo ""

# Verify site ID
if [ "$CURRENT_SITE_ID" != "$EXPECTED_SITE_ID" ]; then
    echo "❌ ERROR: Wrong Netlify site linked!"
    echo ""
    echo "This project is linked to the WRONG site."
    echo "Run the following to fix:"
    echo ""
    echo "  netlify unlink && netlify link --id $EXPECTED_SITE_ID"
    echo ""
    exit 1
fi

# Verify site name
if [ "$CURRENT_SITE_NAME" != "$EXPECTED_SITE_NAME" ]; then
    echo "❌ ERROR: Site name mismatch!"
    echo ""
    echo "Expected: $EXPECTED_SITE_NAME"
    echo "Got: $CURRENT_SITE_NAME"
    echo ""
    exit 1
fi

echo "✅ Site verification PASSED"
echo ""
echo "Deploying to: $EXPECTED_URL"
echo ""

# Deploy
netlify deploy --prod

echo ""
echo "============================================"
echo "  DEPLOYMENT COMPLETE"
echo "============================================"
