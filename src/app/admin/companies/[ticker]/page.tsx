'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Building2, 
  Coins, 
  Users, 
  Settings,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText
} from 'lucide-react';
import { TerminalCard, TerminalButton } from '@/components/ui';
import { Company } from '@/types';
import TreasuryManagement from '@/components/admin/TreasuryManagement';
import ExecutiveCompensationManagement from '@/components/admin/ExecutiveCompensation';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params.ticker as string;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'treasury' | 'executives' | 'capital'>('overview');

  useEffect(() => {
    const loadCompany = async () => {
      try {
        // In production, this would fetch from API
        const { companies } = await import('@/data/mockData');
        const foundCompany = companies.find(c => c.ticker === ticker.toUpperCase());
        if (foundCompany) {
          setCompany(foundCompany);
        } else {
          router.push('/admin/companies');
        }
      } catch (error) {
        console.error('Failed to load company:', error);
        router.push('/admin/companies');
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      loadCompany();
    }
  }, [ticker, router]);

  const handleUpdateTreasury = (treasury: any[]) => {
    if (company) {
      setCompany({ ...company, treasury });
    }
  };

  const handleUpdateExecutives = (executives: any[]) => {
    if (company) {
      setCompany({ ...company, executiveCompensation: executives });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const getTreasuryValue = () => {
    if (!company) return 0;
    return company.treasury.reduce((total, holding) => total + holding.currentValue, 0);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'treasury', label: 'Treasury', icon: Coins },
    { id: 'executives', label: 'Executives', icon: Users },
    { id: 'capital', label: 'Capital Structure', icon: DollarSign }
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[color:var(--terminal-text-secondary)] font-mono">
          Loading company data...
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[color:var(--terminal-text-secondary)] font-mono">
          Company not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <TerminalButton
            variant="ghost"
            onClick={() => router.push('/admin/companies')}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Companies
          </TerminalButton>
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)] font-mono">
              {company.ticker}
            </h1>
            <p className="text-[color:var(--terminal-text-secondary)]">
              {company.name}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-[color:var(--terminal-text-secondary)]">Last Updated</p>
          <p className="font-mono text-[color:var(--terminal-text-primary)]">
            {new Date(company.lastUpdated).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Market Cap</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {formatCurrency(company.marketCap)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Treasury Value</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                {formatCurrency(getTreasuryValue())}
              </p>
            </div>
            <Coins className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Shares Outstanding</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {formatNumber(company.sharesOutstanding)}
              </p>
            </div>
            <FileText className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Treasury Assets</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {company.treasury.length}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[color:var(--terminal-border)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-mono transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-[color:var(--terminal-accent)] text-[color:var(--terminal-accent)]'
                  : 'border-transparent text-[color:var(--terminal-text-secondary)] hover:text-[color:var(--terminal-text-primary)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Company Overview */}
            <TerminalCard title="Company Information">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)] mb-2">
                    Basic Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Ticker:</span>
                      <span className="font-mono">{company.ticker}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Name:</span>
                      <span className="font-mono">{company.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Sector:</span>
                      <span className="font-mono">{company.sector}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Description:</span>
                      <span className="font-mono text-sm">{company.description}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)] mb-2">
                    Financial Metrics
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Market Cap:</span>
                      <span className="font-mono">{formatCurrency(company.marketCap)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Shareholders Equity:</span>
                      <span className="font-mono">{formatCurrency(company.shareholdersEquity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Total Debt:</span>
                      <span className="font-mono">{formatCurrency(company.totalDebt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Treasury Value:</span>
                      <span className="font-mono text-[color:var(--terminal-accent)]">{formatCurrency(getTreasuryValue())}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TerminalCard>

            {/* Business Model */}
            <TerminalCard title="Business Model">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)] mb-2">
                    Revenue & Operations
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Operating Revenue:</span>
                      <span className="font-mono">{formatCurrency(company.businessModel.operatingRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Operating Expenses:</span>
                      <span className="font-mono">{formatCurrency(company.businessModel.operatingExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Cash Burn Rate:</span>
                      <span className="font-mono">{formatCurrency(company.businessModel.cashBurnRate)}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Treasury Focused:</span>
                      <span className="font-mono">{company.businessModel.isTreasuryFocused ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)] mb-2">
                    Revenue Streams
                  </h4>
                  <div className="space-y-1">
                    {company.businessModel.revenueStreams.map((stream, index) => (
                      <div key={index} className="text-sm text-[color:var(--terminal-text-primary)]">
                        • {stream}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TerminalCard>

            {/* Governance */}
            <TerminalCard title="Corporate Governance">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-primary)]">Board Size:</span>
                    <span className="font-mono">{company.governance.boardSize}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-primary)]">Independent Directors:</span>
                    <span className="font-mono">{company.governance.independentDirectors}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--terminal-text-primary)]">CEO is Founder:</span>
                    <span className="font-mono">{company.governance.ceoFounder ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </TerminalCard>
          </div>
        )}

        {activeTab === 'treasury' && (
          <TreasuryManagement 
            company={company} 
            onUpdateTreasury={handleUpdateTreasury}
          />
        )}

        {activeTab === 'executives' && (
          <ExecutiveCompensationManagement 
            company={company} 
            onUpdateExecutives={handleUpdateExecutives}
          />
        )}

        {activeTab === 'capital' && (
          <div className="space-y-6">
            {/* Capital Structure Overview */}
            <TerminalCard title="Share Structure">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)] mb-2">
                    Share Counts
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Basic Shares:</span>
                      <span className="font-mono">{formatNumber(company.capitalStructure.sharesBasic)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Diluted (Current):</span>
                      <span className="font-mono">{formatNumber(company.capitalStructure.sharesDilutedCurrent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Diluted (Assumed):</span>
                      <span className="font-mono">{formatNumber(company.capitalStructure.sharesDilutedAssumed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Float:</span>
                      <span className="font-mono">{formatNumber(company.capitalStructure.sharesFloat)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)] mb-2">
                    Ownership Structure
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Insider Owned:</span>
                      <span className="font-mono">{formatNumber(company.capitalStructure.sharesInsiderOwned)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Institutional:</span>
                      <span className="font-mono">{formatNumber(company.capitalStructure.sharesInstitutionalOwned)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">Stock Options:</span>
                      <span className="font-mono">{formatNumber(company.capitalStructure.stockOptions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[color:var(--terminal-text-primary)]">RSUs:</span>
                      <span className="font-mono">{formatNumber(company.capitalStructure.restrictedStockUnits)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TerminalCard>

            {/* Convertible Debt */}
            <TerminalCard title="Convertible Debt">
              {company.capitalStructure.convertibleDebt.length > 0 ? (
                <div className="space-y-4">
                  {company.capitalStructure.convertibleDebt.map((debt) => (
                    <div key={debt.id} className="p-4 rounded border border-[color:var(--terminal-border)]">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-[color:var(--terminal-text-secondary)]">Principal</p>
                          <p className="font-mono">{formatCurrency(debt.principal)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--terminal-text-secondary)]">Interest Rate</p>
                          <p className="font-mono">{debt.interestRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--terminal-text-secondary)]">Conversion Price</p>
                          <p className="font-mono">{formatCurrency(debt.conversionPrice)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--terminal-text-secondary)]">Maturity</p>
                          <p className="font-mono">{new Date(debt.maturityDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[color:var(--terminal-text-secondary)] font-mono">
                    No convertible debt outstanding
                  </p>
                </div>
              )}
            </TerminalCard>

            {/* Warrants */}
            <TerminalCard title="Warrants">
              {company.capitalStructure.warrants.length > 0 ? (
                <div className="space-y-4">
                  {company.capitalStructure.warrants.map((warrant) => (
                    <div key={warrant.id} className="p-4 rounded border border-[color:var(--terminal-border)]">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-[color:var(--terminal-text-secondary)]">Strike Price</p>
                          <p className="font-mono">{formatCurrency(warrant.strikePrice)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--terminal-text-secondary)]">Total Warrants</p>
                          <p className="font-mono">{formatNumber(warrant.totalWarrants)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--terminal-text-secondary)]">Shares Per Warrant</p>
                          <p className="font-mono">{warrant.sharesPerWarrant}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[color:var(--terminal-text-secondary)]">Expiration</p>
                          <p className="font-mono">{new Date(warrant.expirationDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[color:var(--terminal-text-secondary)] font-mono">
                    No warrants outstanding
                  </p>
                </div>
              )}
            </TerminalCard>
          </div>
        )}
      </div>
    </div>
  );
}