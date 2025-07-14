import { logger } from '../external/utils/logger';

export interface MarketHours {
  name: string;
  timezone: string;
  openTime: string; // HH:MM format
  closeTime: string; // HH:MM format
  tradingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  holidays?: string[]; // YYYY-MM-DD format
}

export interface MarketStatus {
  isOpen: boolean;
  timeToOpen?: number; // milliseconds
  timeToClose?: number; // milliseconds
  nextOpen?: Date;
  nextClose?: Date;
  currentSession?: 'premarket' | 'market' | 'aftermarket' | 'closed';
  extendedHours?: boolean;
}

export interface AdaptiveRates {
  baseInterval: number;
  marketOpenMultiplier: number;
  marketClosedMultiplier: number;
  preMarketMultiplier: number;
  afterMarketMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
}

class MarketHoursService {
  private marketConfigs: Map<string, MarketHours> = new Map();
  
  constructor() {
    this.initializeMarkets();
  }

  private initializeMarkets(): void {
    // US Stock Market (NYSE/NASDAQ)
    this.marketConfigs.set('US_STOCKS', {
      name: 'US Stock Market',
      timezone: 'America/New_York',
      openTime: '09:30',
      closeTime: '16:00',
      tradingDays: [1, 2, 3, 4, 5], // Monday to Friday
      holidays: [
        '2024-01-01', // New Year's Day
        '2024-01-15', // Martin Luther King Jr. Day
        '2024-02-19', // Presidents' Day
        '2024-03-29', // Good Friday
        '2024-05-27', // Memorial Day
        '2024-06-19', // Juneteenth
        '2024-07-04', // Independence Day
        '2024-09-02', // Labor Day
        '2024-11-28', // Thanksgiving
        '2024-12-25', // Christmas
        '2025-01-01', // New Year's Day 2025
        '2025-01-20', // Martin Luther King Jr. Day
        '2025-02-17', // Presidents' Day
        '2025-04-18', // Good Friday
        '2025-05-26', // Memorial Day
        '2025-06-19', // Juneteenth
        '2025-07-04', // Independence Day
        '2025-09-01', // Labor Day
        '2025-11-27', // Thanksgiving
        '2025-12-25', // Christmas
      ],
    });

    // Crypto Market (24/7)
    this.marketConfigs.set('CRYPTO', {
      name: 'Cryptocurrency Market',
      timezone: 'UTC',
      openTime: '00:00',
      closeTime: '23:59',
      tradingDays: [0, 1, 2, 3, 4, 5, 6], // All days
      holidays: [], // No holidays for crypto
    });

    logger.info('MarketHours', 'Market configurations initialized', {
      markets: Array.from(this.marketConfigs.keys()),
    });
  }

  getMarketStatus(marketId: string, date?: Date): MarketStatus {
    const config = this.marketConfigs.get(marketId);
    if (!config) {
      throw new Error(`Unknown market: ${marketId}`);
    }

    const now = date || new Date();
    const marketTime = this.convertToMarketTime(now, config.timezone);
    
    // For crypto, always open
    if (marketId === 'CRYPTO') {
      return {
        isOpen: true,
        currentSession: 'market',
        extendedHours: false,
      };
    }

    const isHoliday = this.isHoliday(marketTime, config.holidays || []);
    const isTradingDay = config.tradingDays.includes(marketTime.getDay());
    
    if (isHoliday || !isTradingDay) {
      const nextOpen = this.getNextMarketOpen(marketTime, config);
      return {
        isOpen: false,
        timeToOpen: nextOpen.getTime() - now.getTime(),
        nextOpen,
        currentSession: 'closed',
        extendedHours: false,
      };
    }

    const { openTime, closeTime } = this.parseMarketTimes(marketTime, config);
    const currentTime = marketTime.getTime();

    if (currentTime >= openTime.getTime() && currentTime < closeTime.getTime()) {
      const timeToClose = closeTime.getTime() - currentTime;
      return {
        isOpen: true,
        timeToClose,
        nextClose: closeTime,
        currentSession: 'market',
        extendedHours: false,
      };
    } else {
      const nextOpen = currentTime < openTime.getTime() 
        ? openTime 
        : this.getNextMarketOpen(marketTime, config);
      
      const timeToOpen = nextOpen.getTime() - currentTime;
      const session = this.determineSession(currentTime, openTime.getTime(), closeTime.getTime());
      
      return {
        isOpen: false,
        timeToOpen,
        nextOpen,
        currentSession: session,
        extendedHours: session === 'premarket' || session === 'aftermarket',
      };
    }
  }

  private convertToMarketTime(date: Date, timezone: string): Date {
    // Simple timezone conversion - in production, use a proper timezone library
    const offset = this.getTimezoneOffset(timezone);
    return new Date(date.getTime() + offset);
  }

  private getTimezoneOffset(timezone: string): number {
    // Simplified timezone handling - in production, use proper timezone library
    switch (timezone) {
      case 'America/New_York':
        return -5 * 60 * 60 * 1000; // EST (simplified, doesn't handle DST)
      case 'UTC':
        return 0;
      default:
        return 0;
    }
  }

  private isHoliday(date: Date, holidays: string[]): boolean {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    return holidays.includes(dateStr);
  }

  private parseMarketTimes(date: Date, config: MarketHours): { openTime: Date; closeTime: Date } {
    const [openHour, openMin] = config.openTime.split(':').map(Number);
    const [closeHour, closeMin] = config.closeTime.split(':').map(Number);

    const openTime = new Date(date);
    openTime.setHours(openHour, openMin, 0, 0);

    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMin, 0, 0);

    return { openTime, closeTime };
  }

  private getNextMarketOpen(currentDate: Date, config: MarketHours): Date {
    let nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(0, 0, 0, 0);

    // Find the next trading day
    while (true) {
      const isTradingDay = config.tradingDays.includes(nextDate.getDay());
      const isHoliday = this.isHoliday(nextDate, config.holidays || []);
      
      if (isTradingDay && !isHoliday) {
        const [openHour, openMin] = config.openTime.split(':').map(Number);
        nextDate.setHours(openHour, openMin, 0, 0);
        return nextDate;
      }
      
      nextDate.setDate(nextDate.getDate() + 1);
    }
  }

  private determineSession(currentTime: number, openTime: number, closeTime: number): 'premarket' | 'aftermarket' | 'closed' {
    const preMarketStart = openTime - (4 * 60 * 60 * 1000); // 4 hours before open
    const afterMarketEnd = closeTime + (4 * 60 * 60 * 1000); // 4 hours after close

    if (currentTime >= preMarketStart && currentTime < openTime) {
      return 'premarket';
    } else if (currentTime >= closeTime && currentTime < afterMarketEnd) {
      return 'aftermarket';
    } else {
      return 'closed';
    }
  }

  // Adaptive refresh rate calculation
  calculateAdaptiveInterval(baseInterval: number, marketId: string, rates?: Partial<AdaptiveRates>): number {
    const defaultRates: AdaptiveRates = {
      baseInterval,
      marketOpenMultiplier: 1.0, // Normal speed during market hours
      marketClosedMultiplier: 3.0, // Slower when market is closed
      preMarketMultiplier: 1.5, // Slightly slower during pre-market
      afterMarketMultiplier: 2.0, // Slower during after-market
      weekendMultiplier: 5.0, // Much slower on weekends
      holidayMultiplier: 10.0, // Very slow on holidays
      ...rates,
    };

    const status = this.getMarketStatus(marketId);
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    let multiplier = defaultRates.marketClosedMultiplier;

    if (marketId === 'CRYPTO') {
      // Crypto is always active, but slower on weekends
      multiplier = isWeekend ? defaultRates.weekendMultiplier : defaultRates.marketOpenMultiplier;
    } else {
      switch (status.currentSession) {
        case 'market':
          multiplier = defaultRates.marketOpenMultiplier;
          break;
        case 'premarket':
          multiplier = defaultRates.preMarketMultiplier;
          break;
        case 'aftermarket':
          multiplier = defaultRates.afterMarketMultiplier;
          break;
        case 'closed':
        default:
          multiplier = isWeekend 
            ? defaultRates.weekendMultiplier 
            : defaultRates.marketClosedMultiplier;
          break;
      }
    }

    const adaptedInterval = Math.round(baseInterval * multiplier);
    
    logger.debug('MarketHours', `Calculated adaptive interval for ${marketId}`, {
      baseInterval,
      multiplier,
      adaptedInterval,
      session: status.currentSession,
      isWeekend,
    });

    return adaptedInterval;
  }

  // Get all market statuses
  getAllMarketStatuses(): Record<string, MarketStatus> {
    const statuses: Record<string, MarketStatus> = {};
    
    for (const marketId of this.marketConfigs.keys()) {
      statuses[marketId] = this.getMarketStatus(marketId);
    }
    
    return statuses;
  }

  // Check if any markets are currently open
  isAnyMarketOpen(): boolean {
    return Object.values(this.getAllMarketStatuses()).some(status => status.isOpen);
  }

  // Get trading calendar for a specific market
  getTradingCalendar(marketId: string, startDate: Date, endDate: Date): Date[] {
    const config = this.marketConfigs.get(marketId);
    if (!config) {
      throw new Error(`Unknown market: ${marketId}`);
    }

    const tradingDays: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const isTradingDay = config.tradingDays.includes(current.getDay());
      const isHoliday = this.isHoliday(current, config.holidays || []);
      
      if (isTradingDay && !isHoliday) {
        tradingDays.push(new Date(current));
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return tradingDays;
  }

  // Subscribe to market status changes
  onMarketStatusChange(marketId: string, callback: (status: MarketStatus) => void): () => void {
    let lastStatus = this.getMarketStatus(marketId);
    
    const interval = setInterval(() => {
      const currentStatus = this.getMarketStatus(marketId);
      
      if (currentStatus.isOpen !== lastStatus.isOpen || 
          currentStatus.currentSession !== lastStatus.currentSession) {
        callback(currentStatus);
        lastStatus = currentStatus;
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }

  // Format time until market event
  formatTimeUntil(milliseconds: number): string {
    if (milliseconds <= 0) return 'Now';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  // Get market summary
  getMarketSummary(): {
    openMarkets: string[];
    closedMarkets: string[];
    preMarketMarkets: string[];
    afterMarketMarkets: string[];
    nextOpenings: Array<{ market: string; time: Date }>;
  } {
    const statuses = this.getAllMarketStatuses();
    const summary = {
      openMarkets: [] as string[],
      closedMarkets: [] as string[],
      preMarketMarkets: [] as string[],
      afterMarketMarkets: [] as string[],
      nextOpenings: [] as Array<{ market: string; time: Date }>,
    };

    for (const [marketId, status] of Object.entries(statuses)) {
      switch (status.currentSession) {
        case 'market':
          summary.openMarkets.push(marketId);
          break;
        case 'premarket':
          summary.preMarketMarkets.push(marketId);
          break;
        case 'aftermarket':
          summary.afterMarketMarkets.push(marketId);
          break;
        case 'closed':
        default:
          summary.closedMarkets.push(marketId);
          break;
      }

      if (status.nextOpen) {
        summary.nextOpenings.push({
          market: marketId,
          time: status.nextOpen,
        });
      }
    }

    summary.nextOpenings.sort((a, b) => a.time.getTime() - b.time.getTime());
    return summary;
  }
}

// Singleton instance
export const marketHoursService = new MarketHoursService();
export default MarketHoursService;