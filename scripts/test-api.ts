#!/usr/bin/env tsx
/**
 * Quick test of Congress.gov API
 * Tests if your API key works and shows sample data
 */

const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error('❌ CONGRESS_API_KEY not set in environment');
  console.error('Get a key at: https://api.congress.gov/sign-up');
  console.error('Then run: export CONGRESS_API_KEY="your_key"');
  process.exit(1);
}

console.log('Testing Congress.gov API...\n');

async function test() {
  try {
    // Test 1: Fetch bill list
    console.log('Test 1: Fetching bill list...');
    const listUrl = `https://api.congress.gov/v3/bill/118/hr?format=json&limit=5&api_key=${API_KEY}`;
    const listResponse = await fetch(listUrl);
    
    if (!listResponse.ok) {
      throw new Error(`HTTP ${listResponse.status}: ${listResponse.statusText}`);
    }
    
    const listData = await listResponse.json();
    console.log(`✅ Found ${listData.bills?.length || 0} bills\n`);
    
    if (listData.bills && listData.bills.length > 0) {
      const firstBill = listData.bills[0];
      console.log('Sample bill:');
      console.log(`  Number: HR ${firstBill.number}`);
      console.log(`  Title: ${firstBill.title?.slice(0, 80)}...`);
      console.log(`  URL: ${firstBill.url}\n`);
      
      // Test 2: Fetch bill details
      console.log('Test 2: Fetching bill details...');
      const detailUrl = `https://api.congress.gov/v3/bill/118/hr/${firstBill.number}?format=json&api_key=${API_KEY}`;
      const detailResponse = await fetch(detailUrl);
      
      if (!detailResponse.ok) {
        throw new Error(`HTTP ${detailResponse.status}: ${detailResponse.statusText}`);
      }
      
      const detailData = await detailResponse.json();
      const bill = detailData.bill;
      
      console.log('✅ Bill details:');
      console.log(`  Title: ${bill.title}`);
      console.log(`  Introduced: ${bill.introducedDate}`);
      console.log(`  Sponsor: ${bill.sponsors?.[0]?.firstName} ${bill.sponsors?.[0]?.lastName}`);
      console.log(`  Committee: ${bill.committees?.[0]?.name || 'None'}`);
      console.log(`  Policy Area: ${bill.policyArea?.name || 'None'}\n`);
    }
    
    console.log('✅ All tests passed!');
    console.log('\nYour API key works. Ready to run the full scraper.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
