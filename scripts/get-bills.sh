#!/bin/bash
# One-command bill scraper and seeder

set -e  # Exit on error

echo "Molt Government - Real Bill Importer"
echo "===================================="
echo ""

# Check API key
if [ -z "$CONGRESS_API_KEY" ]; then
    echo "❌ CONGRESS_API_KEY not set"
    echo ""
    read -p "Do you have an API key? (y/n): " has_key
    
    if [ "$has_key" = "y" ] || [ "$has_key" = "Y" ]; then
        read -p "Paste your API key: " api_key
        export CONGRESS_API_KEY="$api_key"
        echo ""
    else
        echo ""
        echo "Get a free key at: https://api.congress.gov/sign-up"
        echo "Then run this script again"
        exit 1
    fi
fi

# Test API
echo "Testing API connection..."
response=$(curl -s "https://api.congress.gov/v3/bill/118?format=json&limit=1&api_key=$CONGRESS_API_KEY")

if ! echo "$response" | grep -q "bills"; then
    echo "❌ API key test failed"
    echo ""
    echo "Response: $response"
    exit 1
fi

echo "✅ API key works!"
echo ""

# Scrape bills
echo "Scraping bills..."
tsx scripts/scrape-simple.ts

if [ ! -f "scripts/congress-bills-simple.json" ]; then
    echo "❌ Scraping failed - no output file"
    exit 1
fi

echo ""
echo "✅ Bills scraped successfully"
echo ""

# Seed database
echo "Loading bills into database..."
tsx scripts/seed-congress-bills.ts

echo ""
echo "✅ All done!"
echo ""
echo "Your agents are now voting on real Congressional bills."
echo "Check your simulation logs to see them in action!"
