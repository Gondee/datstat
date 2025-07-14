'use client';

import { TerminalCard, MetricCard } from '@/components/ui';
import Link from 'next/link';
import { 
  Building2, 
  Database, 
  Users, 
  Activity,
  TrendingUp,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function AdminDashboard() {
  // Mock admin metrics - in production these would come from your database
  const metrics = {
    totalCompanies: 4,
    lastDataUpdate: '2 hours ago',
    pendingUpdates: 3,
    systemStatus: 'Operational',
    dataIntegrity: 99.8,
    apiRequests: 1247,
  };

  const recentActivity = [
    {
      id: 1,
      type: 'update',
      message: 'Updated MSTR treasury data',
      timestamp: '10 minutes ago',
      user: 'Admin'
    },
    {
      id: 2,
      type: 'create',
      message: 'Added new company DFDV',
      timestamp: '2 hours ago',
      user: 'Admin'
    },
    {
      id: 3,
      type: 'error',
      message: 'Failed to fetch UPXI market data',
      timestamp: '4 hours ago',
      user: 'System'
    },
    {
      id: 4,
      type: 'update',
      message: 'Updated crypto price feeds',
      timestamp: '6 hours ago',
      user: 'System'
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'update':
        return <TrendingUp className="w-4 h-4 text-[color:var(--terminal-primary)]" />;
      case 'create':
        return <Building2 className="w-4 h-4 text-[color:var(--terminal-success)]" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-[color:var(--terminal-danger)]" />;
      default:
        return <Activity className="w-4 h-4 text-[color:var(--terminal-text-secondary)]" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)] font-mono">
          Admin Dashboard
        </h1>
        <p className="text-[color:var(--terminal-text-secondary)] mt-2">
          Monitor and manage your DATstat platform
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Companies"
          value={metrics.totalCompanies.toString()}
          icon={<Building2 className="w-4 h-4" />}
        />
        <MetricCard
          title="Data Integrity"
          value={`${metrics.dataIntegrity}%`}
          change={0.2}
          changeType="percentage"
          icon={<Database className="w-4 h-4" />}
        />
        <MetricCard
          title="API Requests (24h)"
          value={metrics.apiRequests.toLocaleString()}
          change={156}
          changeType="number"
          icon={<Activity className="w-4 h-4" />}
        />
        <MetricCard
          title="System Status"
          value={metrics.systemStatus}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Last Data Update"
          value={metrics.lastDataUpdate}
          icon={<Clock className="w-4 h-4" />}
        />
        <MetricCard
          title="Pending Updates"
          value={metrics.pendingUpdates.toString()}
          icon={<AlertCircle className="w-4 h-4" />}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <TerminalCard title="Recent Activity">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded border border-[color:var(--terminal-border)] hover:bg-[color:var(--terminal-accent)]/5 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[color:var(--terminal-text-primary)] text-sm font-mono">
                    {activity.message}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[color:var(--terminal-text-secondary)] text-xs">
                      {activity.timestamp}
                    </span>
                    <span className="text-[color:var(--terminal-text-muted)] text-xs">
                      by {activity.user}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TerminalCard>

        {/* Quick Actions */}
        <TerminalCard title="Quick Actions">
          <div className="grid grid-cols-1 gap-4">
            <Link
              href="/admin/companies"
              className="flex items-center justify-between p-4 rounded border border-[color:var(--terminal-border)] hover:border-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/5 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-[color:var(--terminal-accent)]" />
                <div>
                  <h3 className="text-[color:var(--terminal-text-primary)] font-medium">
                    Manage Companies
                  </h3>
                  <p className="text-[color:var(--terminal-text-secondary)] text-sm">
                    Add, edit, and manage treasury companies
                  </p>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-[color:var(--terminal-text-secondary)] group-hover:text-[color:var(--terminal-accent)] transition-colors" />
            </Link>

            <Link
              href="/admin/data"
              className="flex items-center justify-between p-4 rounded border border-[color:var(--terminal-border)] hover:border-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/5 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5 text-[color:var(--terminal-accent)]" />
                <div>
                  <h3 className="text-[color:var(--terminal-text-primary)] font-medium">
                    Data Management
                  </h3>
                  <p className="text-[color:var(--terminal-text-secondary)] text-sm">
                    Monitor and refresh data sources
                  </p>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-[color:var(--terminal-text-secondary)] group-hover:text-[color:var(--terminal-accent)] transition-colors" />
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center justify-between p-4 rounded border border-[color:var(--terminal-border)] hover:border-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/5 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-[color:var(--terminal-accent)]" />
                <div>
                  <h3 className="text-[color:var(--terminal-text-primary)] font-medium">
                    User Management
                  </h3>
                  <p className="text-[color:var(--terminal-text-secondary)] text-sm">
                    Manage user accounts and permissions
                  </p>
                </div>
              </div>
              <TrendingUp className="w-4 h-4 text-[color:var(--terminal-text-secondary)] group-hover:text-[color:var(--terminal-accent)] transition-colors" />
            </Link>
          </div>
        </TerminalCard>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <TerminalCard 
          title="System Health"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded bg-[color:var(--terminal-surface)]">
              <div className="text-2xl font-bold text-[color:var(--terminal-success)] font-mono">
                99.9%
              </div>
              <div className="text-[color:var(--terminal-text-secondary)] text-sm">
                Uptime
              </div>
            </div>
            <div className="text-center p-4 rounded bg-[color:var(--terminal-surface)]">
              <div className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                2.1s
              </div>
              <div className="text-[color:var(--terminal-text-secondary)] text-sm">
                Avg Response
              </div>
            </div>
            <div className="text-center p-4 rounded bg-[color:var(--terminal-surface)]">
              <div className="text-2xl font-bold text-[color:var(--terminal-warning)] font-mono">
                45GB
              </div>
              <div className="text-[color:var(--terminal-text-secondary)] text-sm">
                Storage Used
              </div>
            </div>
            <div className="text-center p-4 rounded bg-[color:var(--terminal-surface)]">
              <div className="text-2xl font-bold text-[color:var(--terminal-primary)] font-mono">
                128
              </div>
              <div className="text-[color:var(--terminal-text-secondary)] text-sm">
                Active Users
              </div>
            </div>
          </div>
        </TerminalCard>

        <TerminalCard title="Quick Stats">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded bg-[color:var(--terminal-surface)]">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">
                Data Refresh Rate
              </span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                5min
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-[color:var(--terminal-surface)]">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">
                API Rate Limit
              </span>
              <span className="text-[color:var(--terminal-text-primary)] font-mono">
                1000/hr
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-[color:var(--terminal-surface)]">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">
                Cache Hit Rate
              </span>
              <span className="text-[color:var(--terminal-success)] font-mono">
                94.2%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-[color:var(--terminal-surface)]">
              <span className="text-[color:var(--terminal-text-secondary)] text-sm">
                Error Rate
              </span>
              <span className="text-[color:var(--terminal-danger)] font-mono">
                0.08%
              </span>
            </div>
          </div>
        </TerminalCard>
      </div>
    </div>
  );
}