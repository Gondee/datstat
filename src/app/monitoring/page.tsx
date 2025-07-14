'use client';

import { PerformanceDashboard } from '@/components/monitoring/PerformanceDashboard';
import { TerminalCard } from '@/components/ui';
import { Activity } from 'lucide-react';

export default function MonitoringPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <TerminalCard>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8 text-[color:var(--terminal-accent)]" />
            <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)]">
              System Performance Monitoring
            </h1>
          </div>
          <p className="text-[color:var(--terminal-text-secondary)]">
            Real-time monitoring of system health, performance metrics, and resource utilization.
          </p>
        </div>
      </TerminalCard>

      {/* Performance Dashboard */}
      <PerformanceDashboard refreshInterval={30000} />
    </div>
  );
}