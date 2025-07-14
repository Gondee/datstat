#!/usr/bin/env ts-node

/**
 * Test script to verify database integration
 */

import { getCompaniesWithTreasury, getCompanyByTicker } from '../src/lib/database-utils';
import { analyticsService } from '../src/services/analytics/analyticsService';

async function testDatabaseIntegration() {
  console.log('Testing database integration...\n');

  try {
    // Test 1: Fetch all companies
    console.log('1. Fetching all companies...');
    const companies = await getCompaniesWithTreasury();
    console.log(`✓ Found ${companies.length} companies`);
    
    if (companies.length > 0) {
      console.log('Sample companies:');
      companies.slice(0, 3).forEach(company => {
        const treasuryValue = company.treasuryHoldings.reduce(
          (sum, h) => sum + h.currentValue, 
          0
        );
        console.log(`  - ${company.ticker}: ${company.name} (Treasury: $${treasuryValue.toLocaleString()})`);
      });
    }

    // Test 2: Fetch specific company
    console.log('\n2. Fetching specific company (MSTR)...');
    const mstr = await getCompanyByTicker('MSTR');
    if (mstr) {
      console.log(`✓ Found ${mstr.name}`);
      console.log(`  Holdings: ${mstr.treasuryHoldings.length} crypto assets`);
      mstr.treasuryHoldings.forEach(holding => {
        console.log(`    - ${holding.crypto}: ${holding.amount.toLocaleString()} (Value: $${holding.currentValue.toLocaleString()})`);
      });
    } else {
      console.log('✗ MSTR not found in database');
    }

    // Test 3: Analytics service
    console.log('\n3. Testing analytics service...');
    if (companies.length > 0) {
      const ticker = companies[0].ticker;
      console.log(`  Testing risk analytics for ${ticker}...`);
      
      const riskAnalytics = await analyticsService.getRiskAnalytics(ticker);
      console.log(`✓ Risk analytics calculated`);
      console.log(`  Overall Risk Score: ${riskAnalytics.overallRisk.score}`);
      console.log(`  Risk Level: ${riskAnalytics.overallRisk.level}`);
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabaseIntegration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });