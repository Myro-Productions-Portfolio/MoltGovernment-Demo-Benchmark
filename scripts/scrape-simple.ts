#!/usr/bin/env tsx
/**
 * Simple Congress Bill Scraper
 * Minimal version with better error handling and progress feedback
 */

import fs from 'fs';

const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error('\n❌ ERROR: CONGRESS_API_KEY not set\n');
  console.error('Quick setup:');
  console.error('1. Visit: https://api.congress.gov/sign-up');
  console.error('2. Get your free API key (instant)');
  console.error('3. Run: export CONGRESS_API_KEY="your_key_here"');
  console.error('4. Run this script again\n');
  process.exit(1);
}

const CONGRESS = 118;
const LIMIT = 20; // Start small for testing

console.log('Congress.gov Simple Scraper');
console.log('===========================\n');
console.log(`Fetching ${LIMIT} bills from Congress ${CONGRESS}...\n`);

async function fetchBills() {
  const bills: any[] = [];
  
  try {
    // Fetch House bills
    console.log('📥 Fetching House bills (HR)...');
    const hrUrl = `https://api.congress.gov/v3/bill/${CONGRESS}/hr?format=json&limit=${LIMIT}&api_key=${API_KEY}`;
    const hrResponse = await fetch(hrUrl);
    
    if (!hrResponse.ok) {
      throw new Error(`API error: ${hrResponse.status} ${hrResponse.statusText}`);
    }
    
    const hrData = await hrResponse.json();
    const hrBills = hrData.bills || [];
    console.log(`✅ Got ${hrBills.length} House bills\n`);
    
    // Process each bill
    for (let i = 0; i < Math.min(hrBills.length, 10); i++) {
      const bill = hrBills[i];
      console.log(`  [${i + 1}/10] HR ${bill.number}: ${bill.title?.slice(0, 60)}...`);
      
      // Fetch details
      const detailUrl = `https://api.congress.gov/v3/bill/${CONGRESS}/hr/${bill.number}?format=json&api_key=${API_KEY}`;
      const detailResponse = await fetch(detailUrl);
      
      if (detailResponse.ok) {
        const detailData = await detailResponse.json();
        const detail = detailData.bill;
        
        bills.push({
          id: `congress-${CONGRESS}-hr-${bill.number}`,
          title: detail.title || `HR ${bill.number}`,
          summary: detail.title || 'No summary available',
          committee: detail.committees?.[0]?.name || 'General',
          sponsor: detail.sponsors?.[0] ? 
            `${detail.sponsors[0].firstName} ${detail.sponsors[0].lastName}` : 
            'Unknown',
          introducedDate: detail.introducedDate || new Date().toISOString().split('T')[0],
        });
      }
      
      // Rate limit: wait 200ms between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n✅ Successfully scraped ${bills.length} bills\n`);
    
    // Save to file
    const outputPath = 'scripts/congress-bills-simple.json';
    fs.writeFileSync(outputPath, JSON.stringify(bills, null, 2));
    console.log(`📄 Saved to: ${outputPath}\n`);
    
    // Show sample
    if (bills.length > 0) {
      console.log('Sample bill:');
      console.log(JSON.stringify(bills[0], null, 2));
    }
    
    console.log('\n✅ Done! Next step: tsx scripts/seed-congress-bills.ts');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Check your API key is correct');
    console.error('- Check your internet connection');
    console.error('- Try again in a few minutes (rate limit)');
    process.exit(1);
  }
}

fetchBills();
