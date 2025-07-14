'use client';

import { useState } from 'react';
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  Activity,
  Shield,
  ChevronRight,
  Download,
  Share2
} from 'lucide-react';
import { useCompanies } from '@/utils/store';
import { TerminalCard, TerminalButton } from '@/components/ui';
import { 
  MNavComparisonChart,
  TreasuryCompositionChart,
  PerformanceComparisonChart,
  RiskVisualizationDashboard
} from '@/components/charts';

type ChartView = 'overview' | 'mnav' | 'treasury' | 'performance' | 'risk';

export default function ChartsPage() {
  const [activeView, setActiveView] = useState<ChartView>('overview');
  const companies = useCompanies();

  const chartSections = [
    {
      id: 'mnav' as ChartView,
      title: 'mNAV vs Stock Price Analysis',
      description: 'Real-time comparison of modified NAV versus market prices',
      icon: LineChart,
      color: 'var(--terminal-accent)',
    },
    {
      id: 'treasury' as ChartView,
      title: 'Treasury Composition',
      description: 'Breakdown of digital asset holdings across companies',
      icon: PieChart,
      color: 'var(--terminal-success)',
    },
    {
      id: 'performance' as ChartView,
      title: 'Performance Analytics',
      description: 'Risk-return profiles and yield comparisons',
      icon: Activity,
      color: 'var(--terminal-warning)',
    },
    {
      id: 'risk' as ChartView,
      title: 'Risk Dashboard',
      description: 'Comprehensive risk metrics and analysis',
      icon: Shield,
      color: 'var(--terminal-error)',
    },
  ];

  const renderActiveChart = () => {
    switch (activeView) {
      case 'mnav':
        return (
          <MNavComparisonChart
            companies={companies}
            timeRange="1W"
            showPremiumDiscount={true}
            autoRefresh={true}
            height={500}
          />
        );
      
      case 'treasury':
        return (
          <div className="space-y-6">
            <TreasuryCompositionChart
              companies={companies}
              viewMode="single"
              height={400}
            />
            <TreasuryCompositionChart
              companies={companies}
              viewMode="comparison"
              height={400}
            />
          </div>
        );
      
      case 'performance':
        return (
          <PerformanceComparisonChart
            companies={companies}
            height={500}
          />
        );
      
      case 'risk':
        return (
          <RiskVisualizationDashboard
            companies={companies}
            height={500}
          />
        );
      
      case 'overview':
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MNavComparisonChart
              companies={companies.slice(0, 4)}
              timeRange="1D"
              showPremiumDiscount={true}
              autoRefresh={true}
              height={350}
            />
            <TreasuryCompositionChart
              companies={companies}
              viewMode="single"
              height={350}
            />
            <PerformanceComparisonChart
              companies={companies}
              height={350}
            />
            <RiskVisualizationDashboard
              companies={companies}
              height={350}
            />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--terminal-black)] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)] font-mono flex items-center gap-2">
              <BarChart3 className="w-8 h-8" />
              Analytics & Charts
            </h1>
            <p className="text-[color:var(--terminal-text-secondary)] text-sm mt-1">
              Interactive visualizations for digital asset treasury analysis
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <TerminalButton
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                // Export functionality would be implemented here
                console.log('Export charts');
              }}
            >
              Export
            </TerminalButton>
            <TerminalButton
              variant="ghost"
              size="sm"
              icon={<Share2 className="w-4 h-4" />}
              onClick={() => {
                // Share functionality would be implemented here
                console.log('Share charts');
              }}
            >
              Share
            </TerminalButton>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <TerminalButton
            variant={activeView === 'overview' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('overview')}
          >
            Overview
          </TerminalButton>
          {chartSections.map(section => (
            <TerminalButton
              key={section.id}
              variant={activeView === section.id ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveView(section.id)}
              icon={<section.icon className="w-4 h-4" />}
              style={{
                backgroundColor: activeView === section.id ? section.color : undefined,
              }}
            >
              {section.title}
            </TerminalButton>
          ))}
        </div>
      </div>

      {/* Chart Section Headers (when not in overview) */}
      {activeView !== 'overview' && (
        <div className="mb-6">
          {chartSections
            .filter(section => section.id === activeView)
            .map(section => (
              <div key={section.id} className="flex items-center gap-3">
                <section.icon className="w-6 h-6" style={{ color: section.color }} />
                <div>
                  <h2 className="text-xl font-bold text-[color:var(--terminal-text-primary)]">
                    {section.title}
                  </h2>
                  <p className="text-sm text-[color:var(--terminal-text-secondary)]">
                    {section.description}
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Active Chart Content */}
      {renderActiveChart()}

      {/* Chart Selection Grid (for overview) */}
      {activeView === 'overview' && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-[color:var(--terminal-accent)] mb-4">
            Explore Chart Types
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chartSections.map(section => (
              <TerminalCard
                key={section.id}
                className="cursor-pointer hover:border-[color:var(--terminal-accent)] transition-colors"
                onClick={() => setActiveView(section.id)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <section.icon className="w-8 h-8" style={{ color: section.color }} />
                    <ChevronRight className="w-4 h-4 text-[color:var(--terminal-text-secondary)]" />
                  </div>
                  <h4 className="text-sm font-bold text-[color:var(--terminal-text-primary)] mb-1">
                    {section.title}
                  </h4>
                  <p className="text-xs text-[color:var(--terminal-text-secondary)]">
                    {section.description}
                  </p>
                </div>
              </TerminalCard>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 p-4 bg-[color:var(--terminal-bg-dark)] rounded border border-[color:var(--terminal-border)]">
        <p className="text-xs text-[color:var(--terminal-text-secondary)]">
          <span className="font-bold text-[color:var(--terminal-accent)]">Pro Tip:</span> Use keyboard shortcuts for navigation. 
          Press <kbd className="px-1 py-0.5 bg-[color:var(--terminal-accent)]/20 rounded">?</kbd> for help.
        </p>
      </div>
    </div>
  );
}