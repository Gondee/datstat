import axios, { AxiosInstance } from 'axios';
import { APIResponse, APIServiceConfig, SECFilingResponse, CompanyFilingsResponse } from '../types';
import { cache } from '../utils/cache';
import { logger } from '../utils/logger';
import RateLimiter from '../utils/rateLimiter';

interface ParsedFinancialData {
  totalAssets?: number;
  totalLiabilities?: number;
  shareholdersEquity?: number;
  cash?: number;
  totalDebt?: number;
  sharesOutstanding?: number;
  revenue?: number;
  operatingIncome?: number;
  netIncome?: number;
  reportDate: string;
  filingDate: string;
  formType: string;
}

class SECEdgarService {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private config: APIServiceConfig;
  private readonly serviceName = 'SEC-EDGAR';

  constructor() {
    this.config = {
      baseURL: 'https://data.sec.gov',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 2000,
      rateLimit: {
        requestsPerMinute: 10, // SEC guidelines
        requestsPerHour: 600,
        burstLimit: 5,
      },
      cacheTTL: 3600, // 1 hour cache for filing data
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimit);
    
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DatStat Treasury Analytics (admin@datstat.com)', // Required by SEC
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async (config) => {
        const canProceed = await this.rateLimiter.checkRateLimit(this.serviceName);
        if (!canProceed) {
          logger.warn(this.serviceName, 'Rate limit exceeded, waiting...');
          await this.rateLimiter.waitForRateLimit(this.serviceName);
        }
        
        logger.debug(this.serviceName, `Making request to ${config.url}`, {
          remaining: this.rateLimiter.getRemainingRequests(this.serviceName),
        });
        
        return config;
      },
      (error) => {
        logger.error(this.serviceName, 'Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug(this.serviceName, `Response received from ${response.config.url}`, {
          status: response.status,
        });
        return response;
      },
      async (error) => {
        if (error.response?.status === 429) {
          logger.warn(this.serviceName, 'Rate limited by SEC API');
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          return this.client.request(error.config);
        }
        
        logger.error(this.serviceName, 'Response error', error, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
        });
        
        return Promise.reject(error);
      }
    );
  }

  private tickerToCik: Record<string, string> = {
    'MSTR': '0001050446',
    'DFDV': '0001234567', // Placeholder - need actual CIK
    'UPXI': '0001654672',
    'SBET': '0001890123', // Placeholder - need actual CIK
  };

  private getCikForTicker(ticker: string): string | null {
    return this.tickerToCik[ticker.toUpperCase()] || null;
  }

  async getCompanyFilings(ticker: string): Promise<APIResponse<CompanyFilingsResponse>> {
    const cacheKey = `company_filings_${ticker}`;
    const cachedData = cache.get<CompanyFilingsResponse>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${ticker} filings`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    const cik = this.getCikForTicker(ticker);
    if (!cik) {
      throw new Error(`CIK not found for ticker ${ticker}`);
    }

    try {
      const response = await this.client.get<CompanyFilingsResponse>(`/submissions/CIK${cik}.json`);
      
      cache.set(cacheKey, response.data, this.config.cacheTTL);
      logger.info(this.serviceName, `Fetched filings for ${ticker}`, { 
        cik,
        recentFilings: response.data.filings.recent.form.length,
      });

      return {
        data: response.data,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to fetch filings for ${ticker}`, error as Error);
      throw new Error(`Failed to fetch SEC filings: ${(error as Error).message}`);
    }
  }

  async getRecentQuarterlyFilings(ticker: string): Promise<APIResponse<SECFilingResponse[]>> {
    const cacheKey = `quarterly_filings_${ticker}`;
    const cachedData = cache.get<SECFilingResponse[]>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${ticker} quarterly filings`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    try {
      const filingsResponse = await this.getCompanyFilings(ticker);
      const filings = filingsResponse.data.filings.recent;
      
      // Filter for 10-Q and 10-K forms from the last 2 years
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
      
      const quarterlyFilings: SECFilingResponse[] = [];
      
      for (let i = 0; i < filings.form.length; i++) {
        const form = filings.form[i];
        const filingDate = new Date(filings.filingDate[i]);
        
        if ((form === '10-Q' || form === '10-K') && filingDate >= cutoffDate) {
          quarterlyFilings.push({
            accessionNumber: filings.accessionNumber[i],
            filingDate: filings.filingDate[i],
            reportDate: filings.reportDate[i],
            acceptanceDateTime: filings.acceptanceDateTime[i],
            act: filings.act[i],
            form: filings.form[i],
            fileNumber: filings.fileNumber[i],
            filmNumber: filings.filmNumber[i],
            items: filings.items[i],
            size: filings.size[i],
            isXBRL: filings.isXBRL[i] === 1,
            isInlineXBRL: filings.isInlineXBRL[i] === 1,
            primaryDocument: filings.primaryDocument[i],
            primaryDocDescription: filings.primaryDocDescription[i],
          });
        }
      }

      // Sort by filing date, most recent first
      quarterlyFilings.sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());
      
      cache.set(cacheKey, quarterlyFilings, this.config.cacheTTL);
      logger.info(this.serviceName, `Fetched quarterly filings for ${ticker}`, { 
        count: quarterlyFilings.length,
      });

      return {
        data: quarterlyFilings,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to fetch quarterly filings for ${ticker}`, error as Error);
      throw new Error(`Failed to fetch quarterly filings: ${(error as Error).message}`);
    }
  }

  async getFilingDocument(ticker: string, accessionNumber: string): Promise<APIResponse<string>> {
    const cacheKey = `filing_document_${ticker}_${accessionNumber}`;
    const cachedData = cache.get<string>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${ticker} filing document`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    const cik = this.getCikForTicker(ticker);
    if (!cik) {
      throw new Error(`CIK not found for ticker ${ticker}`);
    }

    try {
      // Remove dashes from accession number for URL
      const accessionNumberForUrl = accessionNumber.replace(/-/g, '');
      const url = `/Archives/edgar/data/${cik.replace(/^0+/, '')}/${accessionNumberForUrl}/${accessionNumber}.txt`;
      
      const response = await this.client.get(url, {
        headers: { 'Accept': 'text/plain' },
        responseType: 'text',
      });
      
      // Cache for longer period since filing documents don't change
      cache.set(cacheKey, response.data, 86400); // 24 hours
      logger.info(this.serviceName, `Fetched filing document for ${ticker}`, { 
        accessionNumber,
        size: response.data.length,
      });

      return {
        data: response.data,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to fetch filing document for ${ticker}`, error as Error);
      throw new Error(`Failed to fetch filing document: ${(error as Error).message}`);
    }
  }

  private parseFinancialData(document: string, formType: string, filingDate: string, reportDate: string): ParsedFinancialData {
    // Basic parsing - in production, you'd want more sophisticated XBRL parsing
    const data: ParsedFinancialData = {
      reportDate,
      filingDate,
      formType,
    };

    // Extract key financial metrics using regex patterns
    // Note: This is simplified - real parsing would use XBRL tags
    
    const patterns = {
      totalAssets: /Total\s+assets\s*[\$,\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      totalLiabilities: /Total\s+liabilities\s*[\$,\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      shareholdersEquity: /(?:Total\s+)?(?:shareholders'?|stockholders'?)\s+equity\s*[\$,\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      cash: /Cash\s+and\s+cash\s+equivalents\s*[\$,\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      totalDebt: /Total\s+debt\s*[\$,\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      sharesOutstanding: /(?:Common\s+shares|shares)\s+outstanding\s*[\s,]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      revenue: /(?:Total\s+)?(?:revenue|net\s+sales)\s*[\$,\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      operatingIncome: /Operating\s+income\s*[\$,\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
      netIncome: /Net\s+income\s*[\$,\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = document.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value)) {
          (data as any)[key] = value;
        }
      }
    }

    return data;
  }

  async parseLatestFinancials(ticker: string): Promise<APIResponse<ParsedFinancialData[]>> {
    const cacheKey = `parsed_financials_${ticker}`;
    const cachedData = cache.get<ParsedFinancialData[]>(cacheKey);
    
    if (cachedData) {
      logger.debug(this.serviceName, `Cache hit for ${ticker} parsed financials`);
      return {
        data: cachedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: `${this.serviceName} (cached)`,
      };
    }

    try {
      const filingsResponse = await this.getRecentQuarterlyFilings(ticker);
      const recentFilings = filingsResponse.data.slice(0, 4); // Last 4 filings
      
      const parsedData: ParsedFinancialData[] = [];
      
      for (const filing of recentFilings) {
        try {
          const documentResponse = await this.getFilingDocument(ticker, filing.accessionNumber);
          const parsed = this.parseFinancialData(
            documentResponse.data,
            filing.form,
            filing.filingDate,
            filing.reportDate
          );
          parsedData.push(parsed);
          
          // Add delay between document requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          logger.warn(this.serviceName, `Failed to parse filing ${filing.accessionNumber}`, {
            error: (error as Error).message,
          });
        }
      }

      // Cache for several hours since financial data changes infrequently
      cache.set(cacheKey, parsedData, 14400); // 4 hours
      
      logger.info(this.serviceName, `Parsed financials for ${ticker}`, { 
        filings: parsedData.length,
      });

      return {
        data: parsedData,
        success: true,
        timestamp: new Date().toISOString(),
        source: this.serviceName,
      };
    } catch (error) {
      logger.error(this.serviceName, `Failed to parse financials for ${ticker}`, error as Error);
      throw new Error(`Failed to parse financial data: ${(error as Error).message}`);
    }
  }

  getHealthStatus() {
    return {
      service: this.serviceName,
      rateLimitRemaining: this.rateLimiter.getRemainingRequests(this.serviceName),
      rateLimitReset: new Date(this.rateLimiter.getResetTime(this.serviceName)).toISOString(),
      cacheStats: cache.getStats(),
      supportedTickers: Object.keys(this.tickerToCik),
    };
  }
}

export const secEdgarService = new SECEdgarService();
export default SECEdgarService;