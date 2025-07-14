export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private currentLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private log(level: LogLevel, service: string, message: string, data?: any, error?: Error): void {
    if (level < this.currentLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      data,
      error,
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const levelStr = LogLevel[level];
      const logMessage = `[${entry.timestamp}] ${levelStr} [${service}] ${message}`;
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(logMessage, data);
          break;
        case LogLevel.INFO:
          console.info(logMessage, data);
          break;
        case LogLevel.WARN:
          console.warn(logMessage, data);
          break;
        case LogLevel.ERROR:
          console.error(logMessage, data, error);
          break;
      }
    }
  }

  debug(service: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, service, message, data);
  }

  info(service: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, service, message, data);
  }

  warn(service: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, service, message, data);
  }

  error(service: string, message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, service, message, data, error);
  }

  getLogs(service?: string, level?: LogLevel, limit = 100): LogEntry[] {
    let filteredLogs = this.logs;

    if (service) {
      filteredLogs = filteredLogs.filter(log => log.service === service);
    }

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    return filteredLogs.slice(-limit);
  }

  getStats(): { totalLogs: number; logsByLevel: Record<string, number>; logsByService: Record<string, number> } {
    const logsByLevel: Record<string, number> = {};
    const logsByService: Record<string, number> = {};

    for (const log of this.logs) {
      const levelStr = LogLevel[log.level];
      logsByLevel[levelStr] = (logsByLevel[levelStr] || 0) + 1;
      logsByService[log.service] = (logsByService[log.service] || 0) + 1;
    }

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      logsByService,
    };
  }

  clear(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
export default Logger;