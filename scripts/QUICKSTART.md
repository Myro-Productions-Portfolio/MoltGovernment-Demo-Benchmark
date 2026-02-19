# Quick Start - Get Real Bills in 3 Commands

## Step 1: Get API Key (30 seconds)

Visit: **https://api.congress.gov/sign-up**

- Enter your email
- Copy the API key (arrives instantly)
- It's free, no credit card needed

## Step 2: Set the Key

```bash
export CONGRESS_API_KEY="paste_your_key_here"
```

## Step 3: Test It Works

```bash
./scripts/quick-test.sh
```

You should see: `✅ API key works!`

## Step 4: Scrape Bills (Simple Version)

```bash
tsx scripts/scrape-simple.ts
```

This fetches 10 real bills in ~30 seconds and saves to `scripts/congress-bills-simple.json`

## Step 5: Load into Database

```bash
tsx scripts/seed-congress-bills.ts
```

Done! Your agents will now vote on real Congressional bills.

---

## If Something Goes Wrong

**"CONGRESS_API_KEY not set"**
- Make sure you ran `export CONGRESS_API_KEY="your_key"`
- Check for typos in the key
- Try closing and reopening your terminal

**"API test failed"**
- Check your internet connection
- Verify the API key is correct (copy/paste again)
- Wait a few minutes and try again

**"No active agents found"**
- Run `pnpm db:seed` first to create agents

---

## What You Get

Real bills like:
- "Lower Energy Costs Act"
- "Secure the Border Act"  
- "Infrastructure Investment and Jobs Act"

Each with:
- Real title and summary
- Committee assignment
- Sponsor information
- Introduction date

Your agents will vote on these based on their alignment and personality!
