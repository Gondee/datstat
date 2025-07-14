'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, DollarSign, Users, Briefcase, AlertTriangle } from 'lucide-react';
import { TerminalCard, TerminalButton, TerminalInput } from '@/components/ui';
import { Company, CryptoType } from '@/types';

interface CompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (company: Partial<Company>) => Promise<void>;
  company?: Company | null;
  mode: 'add' | 'edit';
}

interface FormData {
  ticker: string;
  name: string;
  description: string;
  sector: string;
  marketCap: number;
  sharesOutstanding: number;
  shareholdersEquity: number;
  totalDebt: number;
  
  // Business Model
  revenueStreams: string;
  operatingRevenue: number;
  operatingExpenses: number;
  cashBurnRate: number;
  isTreasuryFocused: boolean;
  legacyBusinessValue: number;
  
  // Capital Structure
  sharesBasic: number;
  sharesDilutedCurrent: number;
  sharesDilutedAssumed: number;
  sharesFloat: number;
  sharesInsiderOwned: number;
  sharesInstitutionalOwned: number;
  weightedAverageShares: number;
  stockOptions: number;
  restrictedStockUnits: number;
  performanceStockUnits: number;
  
  // Governance
  boardSize: number;
  independentDirectors: number;
  ceoFounder: boolean;
  votingRights: string;
  auditFirm: string;
}

export default function CompanyFormModal({ isOpen, onClose, onSave, company, mode }: CompanyFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    ticker: '',
    name: '',
    description: '',
    sector: '',
    marketCap: 0,
    sharesOutstanding: 0,
    shareholdersEquity: 0,
    totalDebt: 0,
    revenueStreams: '',
    operatingRevenue: 0,
    operatingExpenses: 0,
    cashBurnRate: 0,
    isTreasuryFocused: false,
    legacyBusinessValue: 0,
    sharesBasic: 0,
    sharesDilutedCurrent: 0,
    sharesDilutedAssumed: 0,
    sharesFloat: 0,
    sharesInsiderOwned: 0,
    sharesInstitutionalOwned: 0,
    weightedAverageShares: 0,
    stockOptions: 0,
    restrictedStockUnits: 0,
    performanceStockUnits: 0,
    boardSize: 0,
    independentDirectors: 0,
    ceoFounder: false,
    votingRights: '',
    auditFirm: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'business' | 'capital' | 'governance'>('basic');

  useEffect(() => {
    if (company && mode === 'edit') {
      setFormData({
        ticker: company.ticker,
        name: company.name,
        description: company.description,
        sector: company.sector,
        marketCap: company.marketCap,
        sharesOutstanding: company.sharesOutstanding,
        shareholdersEquity: company.shareholdersEquity,
        totalDebt: company.totalDebt,
        revenueStreams: company.businessModel.revenueStreams.join(', '),
        operatingRevenue: company.businessModel.operatingRevenue,
        operatingExpenses: company.businessModel.operatingExpenses,
        cashBurnRate: company.businessModel.cashBurnRate,
        isTreasuryFocused: company.businessModel.isTreasuryFocused,
        legacyBusinessValue: company.businessModel.legacyBusinessValue,
        sharesBasic: company.capitalStructure.sharesBasic,
        sharesDilutedCurrent: company.capitalStructure.sharesDilutedCurrent,
        sharesDilutedAssumed: company.capitalStructure.sharesDilutedAssumed,
        sharesFloat: company.capitalStructure.sharesFloat,
        sharesInsiderOwned: company.capitalStructure.sharesInsiderOwned,
        sharesInstitutionalOwned: company.capitalStructure.sharesInstitutionalOwned,
        weightedAverageShares: company.capitalStructure.weightedAverageShares,
        stockOptions: company.capitalStructure.stockOptions,
        restrictedStockUnits: company.capitalStructure.restrictedStockUnits,
        performanceStockUnits: company.capitalStructure.performanceStockUnits,
        boardSize: company.governance.boardSize,
        independentDirectors: company.governance.independentDirectors,
        ceoFounder: company.governance.ceoFounder,
        votingRights: company.governance.votingRights,
        auditFirm: company.governance.auditFirm
      });
    } else {
      // Reset form for add mode
      setFormData({
        ticker: '',
        name: '',
        description: '',
        sector: '',
        marketCap: 0,
        sharesOutstanding: 0,
        shareholdersEquity: 0,
        totalDebt: 0,
        revenueStreams: '',
        operatingRevenue: 0,
        operatingExpenses: 0,
        cashBurnRate: 0,
        isTreasuryFocused: false,
        legacyBusinessValue: 0,
        sharesBasic: 0,
        sharesDilutedCurrent: 0,
        sharesDilutedAssumed: 0,
        sharesFloat: 0,
        sharesInsiderOwned: 0,
        sharesInstitutionalOwned: 0,
        weightedAverageShares: 0,
        stockOptions: 0,
        restrictedStockUnits: 0,
        performanceStockUnits: 0,
        boardSize: 0,
        independentDirectors: 0,
        ceoFounder: false,
        votingRights: '',
        auditFirm: ''
      });
    }
    setErrors({});
  }, [company, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Basic validation
    if (!formData.ticker.trim()) newErrors.ticker = 'Ticker symbol is required';
    if (!formData.name.trim()) newErrors.name = 'Company name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.sector.trim()) newErrors.sector = 'Sector is required';
    if (formData.marketCap <= 0) newErrors.marketCap = 'Market cap must be positive';
    if (formData.sharesOutstanding <= 0) newErrors.sharesOutstanding = 'Shares outstanding must be positive';

    // Business model validation
    if (formData.operatingRevenue < 0) newErrors.operatingRevenue = 'Operating revenue cannot be negative';
    if (formData.operatingExpenses < 0) newErrors.operatingExpenses = 'Operating expenses cannot be negative';

    // Capital structure validation
    if (formData.sharesBasic <= 0) newErrors.sharesBasic = 'Basic shares must be positive';
    if (formData.sharesDilutedCurrent < formData.sharesBasic) {
      newErrors.sharesDilutedCurrent = 'Diluted shares must be >= basic shares';
    }

    // Governance validation
    if (formData.boardSize < 1) newErrors.boardSize = 'Board must have at least 1 member';
    if (formData.independentDirectors > formData.boardSize) {
      newErrors.independentDirectors = 'Independent directors cannot exceed board size';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const companyData: Partial<Company> = {
        ticker: formData.ticker.toUpperCase(),
        name: formData.name,
        description: formData.description,
        sector: formData.sector,
        marketCap: formData.marketCap,
        sharesOutstanding: formData.sharesOutstanding,
        shareholdersEquity: formData.shareholdersEquity,
        totalDebt: formData.totalDebt,
        businessModel: {
          revenueStreams: formData.revenueStreams.split(',').map(s => s.trim()),
          operatingRevenue: formData.operatingRevenue,
          operatingExpenses: formData.operatingExpenses,
          cashBurnRate: formData.cashBurnRate,
          isTreasuryFocused: formData.isTreasuryFocused,
          legacyBusinessValue: formData.legacyBusinessValue
        },
        capitalStructure: {
          sharesBasic: formData.sharesBasic,
          sharesDilutedCurrent: formData.sharesDilutedCurrent,
          sharesDilutedAssumed: formData.sharesDilutedAssumed,
          sharesFloat: formData.sharesFloat,
          sharesInsiderOwned: formData.sharesInsiderOwned,
          sharesInstitutionalOwned: formData.sharesInstitutionalOwned,
          weightedAverageShares: formData.weightedAverageShares,
          convertibleDebt: company?.capitalStructure?.convertibleDebt || [],
          warrants: company?.capitalStructure?.warrants || [],
          stockOptions: formData.stockOptions,
          restrictedStockUnits: formData.restrictedStockUnits,
          performanceStockUnits: formData.performanceStockUnits
        },
        governance: {
          boardSize: formData.boardSize,
          independentDirectors: formData.independentDirectors,
          ceoFounder: formData.ceoFounder,
          votingRights: formData.votingRights,
          auditFirm: formData.auditFirm
        },
        treasury: company?.treasury || [],
        executiveCompensation: company?.executiveCompensation || [],
        lastUpdated: new Date().toISOString()
      };

      await onSave(companyData);
      onClose();
    } catch (error) {
      console.error('Failed to save company:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Building2 },
    { id: 'business', label: 'Business Model', icon: Briefcase },
    { id: 'capital', label: 'Capital Structure', icon: DollarSign },
    { id: 'governance', label: 'Governance', icon: Users }
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[color:var(--terminal-border)]">
          <h2 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
            {mode === 'add' ? 'Add New Company' : `Edit ${company?.ticker}`}
          </h2>
          <TerminalButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X className="w-4 h-4" />}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[color:var(--terminal-border)] px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-mono transition-colors border-b-2 ${
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

        {/* Form Content */}
        <div className="max-h-[500px] overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <TerminalInput
                    label="Ticker Symbol *"
                    value={formData.ticker}
                    onChange={(e) => handleInputChange('ticker', e.target.value.toUpperCase())}
                    placeholder="e.g., MSTR"
                    error={errors.ticker}
                    disabled={mode === 'edit'}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Company Name *"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., MicroStrategy Inc."
                    error={errors.name}
                  />
                </div>
                <div className="col-span-2">
                  <TerminalInput
                    label="Description *"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief company description"
                    error={errors.description}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Sector *"
                    value={formData.sector}
                    onChange={(e) => handleInputChange('sector', e.target.value)}
                    placeholder="e.g., Technology"
                    error={errors.sector}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Market Cap *"
                    type="number"
                    value={formData.marketCap}
                    onChange={(e) => handleInputChange('marketCap', parseFloat(e.target.value) || 0)}
                    placeholder="Market capitalization"
                    error={errors.marketCap}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Shares Outstanding *"
                    type="number"
                    value={formData.sharesOutstanding}
                    onChange={(e) => handleInputChange('sharesOutstanding', parseFloat(e.target.value) || 0)}
                    placeholder="Number of shares outstanding"
                    error={errors.sharesOutstanding}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Shareholders Equity"
                    type="number"
                    value={formData.shareholdersEquity}
                    onChange={(e) => handleInputChange('shareholdersEquity', parseFloat(e.target.value) || 0)}
                    placeholder="Total shareholders equity"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Total Debt"
                    type="number"
                    value={formData.totalDebt}
                    onChange={(e) => handleInputChange('totalDebt', parseFloat(e.target.value) || 0)}
                    placeholder="Total debt outstanding"
                  />
                </div>
              </div>
            )}

            {/* Business Model Tab */}
            {activeTab === 'business' && (
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <TerminalInput
                    label="Revenue Streams"
                    value={formData.revenueStreams}
                    onChange={(e) => handleInputChange('revenueStreams', e.target.value)}
                    placeholder="Comma-separated list of revenue sources"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Operating Revenue"
                    type="number"
                    value={formData.operatingRevenue}
                    onChange={(e) => handleInputChange('operatingRevenue', parseFloat(e.target.value) || 0)}
                    placeholder="Annual operating revenue"
                    error={errors.operatingRevenue}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Operating Expenses"
                    type="number"
                    value={formData.operatingExpenses}
                    onChange={(e) => handleInputChange('operatingExpenses', parseFloat(e.target.value) || 0)}
                    placeholder="Annual operating expenses"
                    error={errors.operatingExpenses}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Cash Burn Rate"
                    type="number"
                    value={formData.cashBurnRate}
                    onChange={(e) => handleInputChange('cashBurnRate', parseFloat(e.target.value) || 0)}
                    placeholder="Monthly cash burn rate"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Legacy Business Value"
                    type="number"
                    value={formData.legacyBusinessValue}
                    onChange={(e) => handleInputChange('legacyBusinessValue', parseFloat(e.target.value) || 0)}
                    placeholder="Value of non-treasury operations"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center space-x-2 text-[color:var(--terminal-text-primary)] font-mono">
                    <input
                      type="checkbox"
                      checked={formData.isTreasuryFocused}
                      onChange={(e) => handleInputChange('isTreasuryFocused', e.target.checked)}
                      className="rounded border-[color:var(--terminal-border)]"
                    />
                    <span>Treasury-Focused Company</span>
                  </label>
                </div>
              </div>
            )}

            {/* Capital Structure Tab */}
            {activeTab === 'capital' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <TerminalInput
                    label="Basic Shares *"
                    type="number"
                    value={formData.sharesBasic}
                    onChange={(e) => handleInputChange('sharesBasic', parseFloat(e.target.value) || 0)}
                    placeholder="Basic shares outstanding"
                    error={errors.sharesBasic}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Diluted Shares (Current)"
                    type="number"
                    value={formData.sharesDilutedCurrent}
                    onChange={(e) => handleInputChange('sharesDilutedCurrent', parseFloat(e.target.value) || 0)}
                    placeholder="Current diluted shares"
                    error={errors.sharesDilutedCurrent}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Diluted Shares (Assumed)"
                    type="number"
                    value={formData.sharesDilutedAssumed}
                    onChange={(e) => handleInputChange('sharesDilutedAssumed', parseFloat(e.target.value) || 0)}
                    placeholder="Assumed diluted shares"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Float"
                    type="number"
                    value={formData.sharesFloat}
                    onChange={(e) => handleInputChange('sharesFloat', parseFloat(e.target.value) || 0)}
                    placeholder="Shares in public float"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Insider Owned"
                    type="number"
                    value={formData.sharesInsiderOwned}
                    onChange={(e) => handleInputChange('sharesInsiderOwned', parseFloat(e.target.value) || 0)}
                    placeholder="Shares owned by insiders"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Institutional Owned"
                    type="number"
                    value={formData.sharesInstitutionalOwned}
                    onChange={(e) => handleInputChange('sharesInstitutionalOwned', parseFloat(e.target.value) || 0)}
                    placeholder="Shares owned by institutions"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Weighted Average Shares"
                    type="number"
                    value={formData.weightedAverageShares}
                    onChange={(e) => handleInputChange('weightedAverageShares', parseFloat(e.target.value) || 0)}
                    placeholder="Weighted average shares"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Stock Options"
                    type="number"
                    value={formData.stockOptions}
                    onChange={(e) => handleInputChange('stockOptions', parseFloat(e.target.value) || 0)}
                    placeholder="Outstanding stock options"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Restricted Stock Units"
                    type="number"
                    value={formData.restrictedStockUnits}
                    onChange={(e) => handleInputChange('restrictedStockUnits', parseFloat(e.target.value) || 0)}
                    placeholder="Outstanding RSUs"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Performance Stock Units"
                    type="number"
                    value={formData.performanceStockUnits}
                    onChange={(e) => handleInputChange('performanceStockUnits', parseFloat(e.target.value) || 0)}
                    placeholder="Outstanding PSUs"
                  />
                </div>
              </div>
            )}

            {/* Governance Tab */}
            {activeTab === 'governance' && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <TerminalInput
                    label="Board Size *"
                    type="number"
                    value={formData.boardSize}
                    onChange={(e) => handleInputChange('boardSize', parseInt(e.target.value) || 0)}
                    placeholder="Number of board members"
                    error={errors.boardSize}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Independent Directors"
                    type="number"
                    value={formData.independentDirectors}
                    onChange={(e) => handleInputChange('independentDirectors', parseInt(e.target.value) || 0)}
                    placeholder="Number of independent directors"
                    error={errors.independentDirectors}
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Voting Rights"
                    value={formData.votingRights}
                    onChange={(e) => handleInputChange('votingRights', e.target.value)}
                    placeholder="e.g., 1 vote per share"
                  />
                </div>
                <div>
                  <TerminalInput
                    label="Audit Firm"
                    value={formData.auditFirm}
                    onChange={(e) => handleInputChange('auditFirm', e.target.value)}
                    placeholder="e.g., PwC, Deloitte"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center space-x-2 text-[color:var(--terminal-text-primary)] font-mono">
                    <input
                      type="checkbox"
                      checked={formData.ceoFounder}
                      onChange={(e) => handleInputChange('ceoFounder', e.target.checked)}
                      className="rounded border-[color:var(--terminal-border)]"
                    />
                    <span>CEO is Company Founder</span>
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-[color:var(--terminal-border)]">
          <TerminalButton
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </TerminalButton>
          <TerminalButton
            onClick={handleSubmit}
            loading={loading}
            className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
          >
            {mode === 'add' ? 'Add Company' : 'Save Changes'}
          </TerminalButton>
        </div>
      </div>
    </div>
  );
}