import { Company, CryptoMarketData, TreasuryHolding, NewsItem } from '@/types/models';

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Headers
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export companies data to CSV
 */
export function exportCompaniesToCSV(companies: Company[]) {
  const flattenedData = companies.map(company => ({
    ticker: company.ticker,
    name: company.name,
    sector: company.sector,
    exchange: company.exchange,
    marketCap: company.financialMetrics.marketCap,
    revenue: company.financialMetrics.revenue,
    netIncome: company.financialMetrics.netIncome,
    totalTreasuryValue: company.calculatedMetrics.totalTreasuryValue,
    treasuryValuePerShare: company.calculatedMetrics.treasuryValuePerShare,
    navPerShare: company.calculatedMetrics.navPerShare,
    premiumToNavPercent: company.calculatedMetrics.premiumToNavPercent,
    stockPrice: company.stockPrice.current,
    dayChange: company.stockPrice.changePercent,
    btcHoldings: company.treasuryHoldings.find(h => h.cryptoType === 'BTC')?.amount || 0,
    ethHoldings: company.treasuryHoldings.find(h => h.cryptoType === 'ETH')?.amount || 0,
  }));

  exportToCSV(flattenedData, 'treasury_companies');
}

/**
 * Export treasury holdings to CSV
 */
export function exportHoldingsToCSV(holdings: TreasuryHolding[], companyTicker: string) {
  const flattenedData = holdings.map(holding => ({
    company: companyTicker,
    cryptoType: holding.cryptoType,
    amount: holding.amount,
    costBasis: holding.costBasis,
    averagePurchasePrice: holding.averagePurchasePrice,
    currentValue: holding.currentValue,
    unrealizedGainLoss: holding.unrealizedGainLoss,
    percentOfTotalHoldings: holding.percentOfTotalHoldings,
    transactionCount: holding.transactions.length,
  }));

  exportToCSV(flattenedData, `${companyTicker}_holdings`);
}

/**
 * Export news items to CSV
 */
export function exportNewsToCSV(news: NewsItem[]) {
  const flattenedData = news.map(item => ({
    title: item.title,
    source: item.source,
    publishedAt: new Date(item.publishedAt).toISOString(),
    category: item.category,
    sentiment: item.sentiment || 'neutral',
    summary: item.summary,
    tags: item.tags.join(', '),
    relatedTickers: item.relatedTickers?.join(', ') || '',
    relatedCryptos: item.relatedCryptos?.join(', ') || '',
  }));

  exportToCSV(flattenedData, 'treasury_news');
}

/**
 * Export chart as image (requires html2canvas library)
 * This is a placeholder - actual implementation would require additional dependencies
 */
export async function exportChartAsImage(chartElement: HTMLElement, filename: string) {
  try {
    // This would require html2canvas or similar library
    // For now, we'll just log a message
    console.log('Chart export functionality requires html2canvas library');
    
    // Example implementation with html2canvas:
    // const canvas = await html2canvas(chartElement);
    // const imgData = canvas.toDataURL('image/png');
    // const link = document.createElement('a');
    // link.href = imgData;
    // link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`;
    // link.click();
  } catch (error) {
    console.error('Failed to export chart:', error);
  }
}

/**
 * Copy data to clipboard
 */
export async function copyToClipboard(data: any, format: 'json' | 'csv' = 'json') {
  try {
    let textToCopy: string;
    
    if (format === 'json') {
      textToCopy = JSON.stringify(data, null, 2);
    } else {
      // Convert to CSV for simple arrays
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(','),
          ...data.map(row => 
            headers.map(header => row[header]).join(',')
          )
        ];
        textToCopy = csvRows.join('\n');
      } else {
        textToCopy = String(data);
      }
    }
    
    await navigator.clipboard.writeText(textToCopy);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}