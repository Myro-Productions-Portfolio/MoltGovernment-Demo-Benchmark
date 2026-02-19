# Congress.gov Bill Scraper

Fetch real US Congressional bills and load them into Molt Government for your AI agents to vote on.

## Quick Start

### 1. Get a Free API Key

Visit: https://api.congress.gov/sign-up

- Enter your email
- You'll receive the API key instantly (no approval needed)
- It's completely free, no credit card required

### 2. Set Environment Variable

```bash
export CONGRESS_API_KEY="your_api_key_here"
```

Or add to your `.env` file:
```
CONGRESS_API_KEY=your_api_key_here
```

### 3. Scrape Bills

```bash
tsx scripts/scrape-congress-bills.ts
```

This will:
- Fetch 50 House bills (HR) and 50 Senate bills (S) from the 118th Congress (2023-2024)
- Download titles, summaries, sponsor info, committee assignments
- Save to `scripts/congress-bills.json`
- Takes about 2-3 minutes (rate limited to avoid API throttling)

### 4. Load into Database

```bash
tsx scripts/seed-congress-bills.ts
```

This will:
- Read `congress-bills.json`
- Randomly assign bills to your active agents as sponsors
- Randomly assign 0-3 co-sponsors per bill
- Insert into your `bills` table with status='proposed'
- Skip any bills that already exist (safe to re-run)

### 5. Watch Your Simulation

Your agents will now vote on real legislation like:
- "Infrastructure Investment and Jobs Act"
- "American Rescue Plan Act"
- "Inflation Reduction Act"
- "CHIPS and Science Act"

## Customization

### Change Congress Number

Edit `scrape-congress-bills.ts`:
```typescript
const CONGRESS_NUMBER = 117; // 117 = 2021-2022, 116 = 2019-2020
```

### Change Bill Count

Edit `scrape-congress-bills.ts`:
```typescript
const BILLS_PER_TYPE = 100; // Fetch 100 of each type instead of 50
```

### Filter by Policy Area

After scraping, you can filter `congress-bills.json` by `policyArea`:
- "Health"
- "Economics and Public Finance"
- "Environmental Protection"
- "Science, Technology, Communications"
- "Armed Forces and National Security"
- "Immigration"
- "Education"
- "Energy"

## API Rate Limits

Congress.gov API allows:
- 5,000 requests per hour
- No daily limit

The scraper includes:
- Automatic retry with exponential backoff
- 100ms delay between requests
- Error handling for failed fetches

## Output Format

Each bill in `congress-bills.json` contains:

```json
{
  "externalId": "congress-118-hr-1234",
  "title": "Infrastructure Investment and Jobs Act",
  "summary": "This bill addresses provisions related to...",
  "fullText": "[Real bill from 118th Congress]...",
  "committee": "transportation",
  "policyArea": "Transportation and Public Works",
  "introducedDate": "2023-03-15",
  "sponsorInfo": {
    "name": "John Smith",
    "party": "D",
    "state": "CA"
  },
  "cosponsorCount": 42
}
```

## Troubleshooting

### "API key not set"
Make sure `CONGRESS_API_KEY` is in your environment or `.env` file.

### "No active agents found"
Run your database seed script first to create agents:
```bash
pnpm db:seed
```

### "HTTP 429: Too Many Requests"
You've hit the rate limit. Wait an hour or reduce `BILLS_PER_TYPE`.

### Bills have no summary
Some bills don't have summaries yet. The scraper will use "No summary available."

## What's Next?

### Add More Document Types

1. **Executive Orders**: Scrape from Federal Register API
2. **Supreme Court Opinions**: Scrape from CourtListener API
3. **State Legislation**: Use OpenStates API
4. **Committee Reports**: Available via Congress.gov API
5. **Budget Documents**: CBO and OMB publish JSON data

### Create Document Templates

Use the scraped bills to create templates:
```typescript
// Extract common patterns
const billTemplate = {
  title: "The [POLICY_AREA] [ACTION] Act of [YEAR]",
  summary: "This bill [VERB] provisions related to [TOPIC]...",
  sections: [
    "Short Title",
    "Findings",
    "Definitions", 
    "Authorization of Appropriations",
    "Effective Date"
  ]
};
```

### Train on Real Legislative Language

Use the `fullText` field to fine-tune your models on actual legislative writing style.

## Legal Note

All US federal government documents are public domain (17 USC §105). You can freely use, modify, and distribute this data without attribution requirements.
