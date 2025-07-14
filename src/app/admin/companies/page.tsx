'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { TerminalCard, TerminalButton, TerminalInput } from '@/components/ui';
import { Company } from '@/types';

export default function CompaniesManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Mock data load - in production this would be from API
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        // Simulate API call
        const { companies: mockCompanies } = await import('@/data/mockData');
        setCompanies(mockCompanies);
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompanies();
  }, []);

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.ticker.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCompany = () => {
    setSelectedCompany(null);
    setShowAddModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowEditModal(true);
  };

  const handleDeleteCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedCompany) {
      setCompanies(companies.filter(c => c.ticker !== selectedCompany.ticker));
      setShowDeleteModal(false);
      setSelectedCompany(null);
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

  const getTreasuryValue = (company: Company) => {
    return company.treasury.reduce((total, holding) => total + holding.currentValue, 0);
  };

  const getTreasuryStatus = (company: Company) => {
    const treasuryValue = getTreasuryValue(company);
    const marketCap = company.marketCap;
    const ratio = treasuryValue / marketCap;
    
    if (ratio > 0.5) return { status: 'high', icon: CheckCircle, color: 'text-[color:var(--terminal-success)]' };
    if (ratio > 0.2) return { status: 'medium', icon: AlertTriangle, color: 'text-[color:var(--terminal-warning)]' };
    return { status: 'low', icon: XCircle, color: 'text-[color:var(--terminal-danger)]' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[color:var(--terminal-text-secondary)] font-mono">
          Loading companies...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)] font-mono">
            Company Management
          </h1>
          <p className="text-[color:var(--terminal-text-secondary)] mt-2">
            Manage digital asset treasury companies and their data
          </p>
        </div>
        <TerminalButton
          onClick={handleAddCompany}
          icon={<Plus className="w-4 h-4" />}
          className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
        >
          Add Company
        </TerminalButton>
      </div>

      {/* Search and Filters */}
      <TerminalCard title="Search & Filter">
        <div className="flex space-x-4">
          <div className="flex-1">
            <TerminalInput
              type="text"
              placeholder="Search companies by name or ticker..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>
      </TerminalCard>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredCompanies.map((company) => {
          const treasuryValue = getTreasuryValue(company);
          const treasuryStatus = getTreasuryStatus(company);
          const StatusIcon = treasuryStatus.icon;

          return (
            <TerminalCard key={company.ticker} className="hover:border-[color:var(--terminal-accent)] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 rounded bg-[color:var(--terminal-accent)]/10">
                      <Building2 className="w-6 h-6 text-[color:var(--terminal-accent)]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-[color:var(--terminal-text-primary)] font-mono">
                          {company.ticker}
                        </h3>
                        <StatusIcon className={`w-4 h-4 ${treasuryStatus.color}`} />
                      </div>
                      <p className="text-[color:var(--terminal-text-secondary)]">
                        {company.name}
                      </p>
                      <p className="text-sm text-[color:var(--terminal-text-muted)] mt-1">
                        {company.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-8">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-4 gap-6 text-center">
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-[color:var(--terminal-text-secondary)] text-xs mb-1">
                        <DollarSign className="w-3 h-3" />
                        <span>Market Cap</span>
                      </div>
                      <div className="text-[color:var(--terminal-text-primary)] font-mono font-bold">
                        {formatCurrency(company.marketCap)}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-center space-x-1 text-[color:var(--terminal-text-secondary)] text-xs mb-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Treasury</span>
                      </div>
                      <div className="text-[color:var(--terminal-accent)] font-mono font-bold">
                        {formatCurrency(treasuryValue)}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-center space-x-1 text-[color:var(--terminal-text-secondary)] text-xs mb-1">
                        <Users className="w-3 h-3" />
                        <span>Shares</span>
                      </div>
                      <div className="text-[color:var(--terminal-text-primary)] font-mono font-bold">
                        {formatNumber(company.sharesOutstanding)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[color:var(--terminal-text-secondary)] text-xs mb-1">
                        Assets
                      </div>
                      <div className="text-[color:var(--terminal-text-primary)] font-mono font-bold">
                        {company.treasury.length}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCompany(company)}
                      icon={<Edit3 className="w-4 h-4" />}
                      className="text-[color:var(--terminal-primary)] hover:bg-[color:var(--terminal-primary)]/10"
                    >
                      Edit
                    </TerminalButton>
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCompany(company)}
                      icon={<Trash2 className="w-4 h-4" />}
                      className="text-[color:var(--terminal-danger)] hover:bg-[color:var(--terminal-danger)]/10"
                    >
                      Delete
                    </TerminalButton>
                  </div>
                </div>
              </div>

              {/* Treasury Holdings Summary */}
              <div className="mt-4 pt-4 border-t border-[color:var(--terminal-border)]">
                <div className="flex items-center space-x-6">
                  <span className="text-[color:var(--terminal-text-secondary)] text-sm font-mono">
                    Treasury Holdings:
                  </span>
                  {company.treasury.map((holding, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-[color:var(--terminal-accent)] font-mono font-bold">
                        {holding.amount.toLocaleString()} {holding.crypto}
                      </span>
                      <span className="text-[color:var(--terminal-text-muted)] text-sm">
                        ({formatCurrency(holding.currentValue)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TerminalCard>
          );
        })}

        {filteredCompanies.length === 0 && (
          <TerminalCard>
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-[color:var(--terminal-text-muted)] mx-auto mb-4" />
              <h3 className="text-[color:var(--terminal-text-secondary)] font-mono mb-2">
                No companies found
              </h3>
              <p className="text-[color:var(--terminal-text-muted)] text-sm">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first company'}
              </p>
            </div>
          </TerminalCard>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono mb-4">
              Delete Company
            </h3>
            <p className="text-[color:var(--terminal-text-secondary)] mb-6">
              Are you sure you want to delete <strong>{selectedCompany.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <TerminalButton
                variant="ghost"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={confirmDelete}
                className="bg-[color:var(--terminal-danger)] hover:bg-[color:var(--terminal-danger)]/80"
              >
                Delete
              </TerminalButton>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Total Companies</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {companies.length}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Total Treasury Value</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                {formatCurrency(companies.reduce((total, company) => total + getTreasuryValue(company), 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Average Market Cap</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {formatCurrency(companies.reduce((total, company) => total + company.marketCap, 0) / companies.length || 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>
      </div>
    </div>
  );
}