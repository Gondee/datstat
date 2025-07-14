import { logger } from '../utils/logger';
import { DataSourceStatus } from '../dataIntegration';

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  service: string;
  message: string;
  data?: any;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  service: string;
  condition: 'error_rate' | 'latency' | 'downtime' | 'rate_limit';
  threshold: number;
  duration: number; // seconds
  enabled: boolean;
}

class AlertingService {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private alertHistory: Alert[] = [];
  private maxHistorySize = 1000;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private errorCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'coingecko_error_rate',
        name: 'CoinGecko High Error Rate',
        service: 'CoinGecko',
        condition: 'error_rate',
        threshold: 50, // 50% error rate
        duration: 300, // 5 minutes
        enabled: true,
      },
      {
        id: 'alphavantage_rate_limit',
        name: 'Alpha Vantage Rate Limit',
        service: 'AlphaVantage',
        condition: 'rate_limit',
        threshold: 90, // 90% of rate limit used
        duration: 60, // 1 minute
        enabled: true,
      },
      {
        id: 'sec_downtime',
        name: 'SEC EDGAR Service Down',
        service: 'SEC_EDGAR',
        condition: 'downtime',
        threshold: 300, // 5 minutes downtime
        duration: 300,
        enabled: true,
      },
      {
        id: 'database_latency',
        name: 'Database High Latency',
        service: 'Database',
        condition: 'latency',
        threshold: 5000, // 5 seconds
        duration: 120, // 2 minutes
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    logger.info('Alerting', 'Initialized default alert rules', {
      count: defaultRules.length,
    });
  }

  private startMonitoring(): void {
    // Check alert conditions every minute
    this.monitoringInterval = setInterval(() => {
      this.checkAlertConditions();
    }, 60000);

    logger.info('Alerting', 'Started monitoring for alert conditions');
  }

  private async checkAlertConditions(): Promise<void> {
    try {
      // This would typically check against your data sources
      // For now, we'll simulate some basic checks
      
      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;

        switch (rule.condition) {
          case 'error_rate':
            await this.checkErrorRate(rule);
            break;
          case 'rate_limit':
            await this.checkRateLimit(rule);
            break;
          case 'downtime':
            await this.checkDowntime(rule);
            break;
          case 'latency':
            await this.checkLatency(rule);
            break;
        }
      }
    } catch (error) {
      logger.error('Alerting', 'Error checking alert conditions', error as Error);
    }
  }

  private async checkErrorRate(rule: AlertRule): Promise<void> {
    const errorStats = this.errorCounts.get(rule.service);
    if (!errorStats) return;

    const now = Date.now();
    if (now > errorStats.resetTime) {
      // Reset error count every hour
      this.errorCounts.set(rule.service, {
        count: 0,
        resetTime: now + 3600000,
      });
      return;
    }

    // Simulate error rate calculation (would be based on actual metrics)
    const errorRate = (errorStats.count / 100) * 100; // Assuming 100 total requests

    if (errorRate > rule.threshold) {
      this.createAlert({
        type: 'error',
        service: rule.service,
        message: `High error rate detected: ${errorRate.toFixed(1)}%`,
        data: { errorRate, threshold: rule.threshold },
      });
    }
  }

  private async checkRateLimit(rule: AlertRule): Promise<void> {
    // This would check actual rate limit usage from services
    // For now, simulate based on service health
    const rateUsage = Math.random() * 100;

    if (rateUsage > rule.threshold) {
      this.createAlert({
        type: 'warning',
        service: rule.service,
        message: `Rate limit usage high: ${rateUsage.toFixed(1)}%`,
        data: { rateUsage, threshold: rule.threshold },
      });
    }
  }

  private async checkDowntime(rule: AlertRule): Promise<void> {
    // This would check actual service availability
    // For now, simulate random downtime
    const isDown = Math.random() < 0.01; // 1% chance of being "down"

    if (isDown) {
      this.createAlert({
        type: 'error',
        service: rule.service,
        message: `Service appears to be down`,
        data: { rule: rule.name },
      });
    }
  }

  private async checkLatency(rule: AlertRule): Promise<void> {
    // This would check actual latency metrics
    // For now, simulate random latency
    const latency = Math.random() * 10000;

    if (latency > rule.threshold) {
      this.createAlert({
        type: 'warning',
        service: rule.service,
        message: `High latency detected: ${latency.toFixed(0)}ms`,
        data: { latency, threshold: rule.threshold },
      });
    }
  }

  createAlert(alertData: {
    type: Alert['type'];
    service: string;
    message: string;
    data?: any;
  }): Alert {
    const alert: Alert = {
      id: this.generateAlertId(),
      type: alertData.type,
      service: alertData.service,
      message: alertData.message,
      data: alertData.data,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    // Check if similar alert already exists
    const existingAlert = Array.from(this.alerts.values()).find(
      a => a.service === alert.service && 
           a.message === alert.message && 
           !a.resolved
    );

    if (existingAlert) {
      logger.debug('Alerting', 'Duplicate alert suppressed', { alertId: existingAlert.id });
      return existingAlert;
    }

    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Trim history if needed
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }

    logger.warn('Alerting', `New ${alert.type} alert: ${alert.message}`, {
      alertId: alert.id,
      service: alert.service,
      data: alert.data,
    });

    // Here you would typically send notifications (email, Slack, etc.)
    this.sendNotification(alert);

    return alert;
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();

    logger.info('Alerting', `Alert resolved: ${alert.message}`, {
      alertId,
      service: alert.service,
    });

    return true;
  }

  resolveAllAlerts(service?: string): number {
    let resolvedCount = 0;

    for (const alert of this.alerts.values()) {
      if (!alert.resolved && (!service || alert.service === service)) {
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();
        resolvedCount++;
      }
    }

    if (resolvedCount > 0) {
      logger.info('Alerting', `Resolved ${resolvedCount} alerts`, { service });
    }

    return resolvedCount;
  }

  getActiveAlerts(service?: string): Alert[] {
    return Array.from(this.alerts.values()).filter(
      alert => !alert.resolved && (!service || alert.service === service)
    );
  }

  getAllAlerts(limit = 100): Alert[] {
    return this.alertHistory
      .slice(-limit)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getAlertStats(): any {
    const activeAlerts = this.getActiveAlerts();
    const last24h = this.alertHistory.filter(
      alert => Date.now() - new Date(alert.timestamp).getTime() < 86400000
    );

    const statsByType = {
      error: activeAlerts.filter(a => a.type === 'error').length,
      warning: activeAlerts.filter(a => a.type === 'warning').length,
      info: activeAlerts.filter(a => a.type === 'info').length,
    };

    const statsByService: Record<string, number> = {};
    activeAlerts.forEach(alert => {
      statsByService[alert.service] = (statsByService[alert.service] || 0) + 1;
    });

    return {
      active: {
        total: activeAlerts.length,
        byType: statsByType,
        byService: statsByService,
      },
      last24h: {
        total: last24h.length,
        resolved: last24h.filter(a => a.resolved).length,
      },
      rules: {
        total: this.rules.size,
        enabled: Array.from(this.rules.values()).filter(r => r.enabled).length,
      },
    };
  }

  recordError(service: string): void {
    const errorStats = this.errorCounts.get(service) || {
      count: 0,
      resetTime: Date.now() + 3600000,
    };

    errorStats.count++;
    this.errorCounts.set(service, errorStats);
  }

  private sendNotification(alert: Alert): void {
    // Here you would implement actual notification sending
    // For now, just log the notification
    logger.info('Alerting', 'Notification sent', {
      alertId: alert.id,
      type: alert.type,
      service: alert.service,
      message: alert.message,
    });

    // In a real implementation, you might:
    // - Send email notifications
    // - Post to Slack/Discord
    // - Send SMS for critical alerts
    // - Create tickets in issue tracking systems
    // - Call webhooks
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alerting', 'Added alert rule', { ruleId: rule.id, name: rule.name });
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      logger.info('Alerting', 'Removed alert rule', { ruleId });
    }
    return removed;
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    logger.info('Alerting', 'Updated alert rule', { ruleId, updates });
    return true;
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.alerts.clear();
    this.alertHistory = [];
    this.rules.clear();
    this.errorCounts.clear();
    
    logger.info('Alerting', 'Alerting service destroyed');
  }
}

export const alertingService = new AlertingService();
export default AlertingService;