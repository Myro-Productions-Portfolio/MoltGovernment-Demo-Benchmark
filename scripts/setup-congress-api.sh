#!/bin/bash
# Quick setup script for Congress.gov API

echo "Congress.gov API Setup"
echo "======================"
echo ""
echo "Step 1: Get your free API key"
echo "Opening browser to: https://api.congress.gov/sign-up"
echo ""

# Try to open browser (works on macOS, Linux, WSL)
if command -v open &> /dev/null; then
    open "https://api.congress.gov/sign-up"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://api.congress.gov/sign-up"
else
    echo "Please visit: https://api.congress.gov/sign-up"
fi

echo ""
echo "Step 2: Enter your API key when you receive it"
read -p "API Key: " api_key

if [ -z "$api_key" ]; then
    echo "❌ No API key entered. Exiting."
    exit 1
fi

# Add to .env file
if [ -f .env ]; then
    # Check if key already exists
    if grep -q "CONGRESS_API_KEY" .env; then
        # Update existing key
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/CONGRESS_API_KEY=.*/CONGRESS_API_KEY=$api_key/" .env
        else
            sed -i "s/CONGRESS_API_KEY=.*/CONGRESS_API_KEY=$api_key/" .env
        fi
        echo "✅ Updated CONGRESS_API_KEY in .env"
    else
        # Append new key
        echo "" >> .env
        echo "# Congress.gov API" >> .env
        echo "CONGRESS_API_KEY=$api_key" >> .env
        echo "✅ Added CONGRESS_API_KEY to .env"
    fi
else
    # Create new .env file
    echo "CONGRESS_API_KEY=$api_key" > .env
    echo "✅ Created .env with CONGRESS_API_KEY"
fi

echo ""
echo "Step 3: Test the API connection"
echo "Running test fetch..."
echo ""

# Test the API
response=$(curl -s "https://api.congress.gov/v3/bill/118?format=json&limit=1&api_key=$api_key")

if echo "$response" | grep -q "bills"; then
    echo "✅ API key is valid!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: tsx scripts/scrape-congress-bills.ts"
    echo "  2. Run: tsx scripts/seed-congress-bills.ts"
    echo "  3. Watch your agents vote on real legislation!"
else
    echo "❌ API key test failed. Response:"
    echo "$response"
    exit 1
fi
