#!/bin/bash
# Quick test of Congress.gov API

if [ -z "$CONGRESS_API_KEY" ]; then
    echo "❌ CONGRESS_API_KEY not set"
    echo ""
    echo "Get a free key at: https://api.congress.gov/sign-up"
    echo "Then run: export CONGRESS_API_KEY='your_key_here'"
    exit 1
fi

echo "Testing Congress.gov API..."
echo ""

response=$(curl -s "https://api.congress.gov/v3/bill/118/hr/1?format=json&api_key=$CONGRESS_API_KEY")

if echo "$response" | grep -q "\"title\""; then
    echo "✅ API key works!"
    echo ""
    echo "Sample bill title:"
    echo "$response" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4
    echo ""
    echo "Ready to run: tsx scripts/scrape-simple.ts"
else
    echo "❌ API test failed"
    echo ""
    echo "Response:"
    echo "$response" | head -20
fi
