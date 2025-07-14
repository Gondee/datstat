'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  DollarSign,
  TrendingUp,
  Award,
  Briefcase
} from 'lucide-react';
import { TerminalCard, TerminalButton, TerminalInput } from '@/components/ui';
import { Company, ExecutiveCompensation } from '@/types';

interface ExecutiveCompensationProps {
  company: Company;
  onUpdateExecutives: (executives: ExecutiveCompensation[]) => void;
}

interface ExecutiveFormData {
  name: string;
  title: string;
  cashCompensation: number;
  equityCompensation: number;
  cryptoCompensation: number;
  sharesOwned: number;
  optionsOutstanding: number;
  year: number;
}

export default function ExecutiveCompensationManagement({ 
  company, 
  onUpdateExecutives 
}: ExecutiveCompensationProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingExecutive, setEditingExecutive] = useState<ExecutiveCompensation | null>(null);
  const [formData, setFormData] = useState<ExecutiveFormData>({
    name: '',
    title: '',
    cashCompensation: 0,
    equityCompensation: 0,
    cryptoCompensation: 0,
    sharesOwned: 0,
    optionsOutstanding: 0,
    year: new Date().getFullYear()
  });

  const handleAddExecutive = () => {
    setEditingExecutive(null);
    setFormData({
      name: '',
      title: '',
      cashCompensation: 0,
      equityCompensation: 0,
      cryptoCompensation: 0,
      sharesOwned: 0,
      optionsOutstanding: 0,
      year: new Date().getFullYear()
    });
    setShowModal(true);
  };

  const handleEditExecutive = (executive: ExecutiveCompensation) => {
    setEditingExecutive(executive);
    setFormData({
      name: executive.name,
      title: executive.title,
      cashCompensation: executive.cashCompensation,
      equityCompensation: executive.equityCompensation,
      cryptoCompensation: executive.cryptoCompensation || 0,
      sharesOwned: executive.sharesOwned,
      optionsOutstanding: executive.optionsOutstanding,
      year: executive.year
    });
    setShowModal(true);
  };

  const handleSaveExecutive = () => {
    const totalCompensation = formData.cashCompensation + formData.equityCompensation + formData.cryptoCompensation;
    
    const executiveData: ExecutiveCompensation = {
      ...formData,
      totalCompensation
    };

    let updatedExecutives;
    if (editingExecutive) {
      updatedExecutives = company.executiveCompensation.map(exec =>
        exec.name === editingExecutive.name && exec.year === editingExecutive.year
          ? executiveData
          : exec
      );
    } else {
      updatedExecutives = [...company.executiveCompensation, executiveData];
    }

    onUpdateExecutives(updatedExecutives);
    setShowModal(false);
    setEditingExecutive(null);
  };

  const handleDeleteExecutive = (executive: ExecutiveCompensation) => {
    const updatedExecutives = company.executiveCompensation.filter(
      exec => !(exec.name === executive.name && exec.year === executive.year)
    );
    onUpdateExecutives(updatedExecutives);
  };

  const getCurrentYearExecutives = () => {
    const currentYear = new Date().getFullYear();
    return company.executiveCompensation.filter(exec => exec.year === currentYear);
  };

  const getTotalCompensation = () => {
    return getCurrentYearExecutives().reduce((total, exec) => total + exec.totalCompensation, 0);
  };

  const getTotalEquityValue = () => {
    return getCurrentYearExecutives().reduce((total, exec) => total + exec.equityCompensation, 0);
  };

  const getTotalCryptoCompensation = () => {
    return getCurrentYearExecutives().reduce((total, exec) => total + (exec.cryptoCompensation || 0), 0);
  };

  const getExecutivesByYear = () => {
    const groupedByYear: { [year: number]: ExecutiveCompensation[] } = {};
    company.executiveCompensation.forEach(exec => {
      if (!groupedByYear[exec.year]) {
        groupedByYear[exec.year] = [];
      }
      groupedByYear[exec.year].push(exec);
    });
    return groupedByYear;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const currentYearExecutives = getCurrentYearExecutives();
  const executivesByYear = getExecutivesByYear();
  const years = Object.keys(executivesByYear).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Total Compensation</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                {formatCurrency(getTotalCompensation())}
              </p>
              <p className="text-xs text-[color:var(--terminal-text-muted)]">
                Current year
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Equity Compensation</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-success)] font-mono">
                {formatCurrency(getTotalEquityValue())}
              </p>
              <p className="text-xs text-[color:var(--terminal-text-muted)]">
                Stock & options
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[color:var(--terminal-success)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Crypto Compensation</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-warning)] font-mono">
                {formatCurrency(getTotalCryptoCompensation())}
              </p>
              <p className="text-xs text-[color:var(--terminal-text-muted)]">
                Digital assets
              </p>
            </div>
            <Award className="w-8 h-8 text-[color:var(--terminal-warning)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Executives</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {currentYearExecutives.length}
              </p>
              <p className="text-xs text-[color:var(--terminal-text-muted)]">
                Named officers
              </p>
            </div>
            <Users className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>
      </div>

      {/* Action Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
          Executive Compensation
        </h2>
        <TerminalButton
          onClick={handleAddExecutive}
          icon={<Plus className="w-4 h-4" />}
          className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
        >
          Add Executive
        </TerminalButton>
      </div>

      {/* Executive Data by Year */}
      {years.map(year => (
        <TerminalCard key={year} title={`${year} Compensation Data`}>
          <div className="space-y-4">
            {executivesByYear[year].map((executive) => (
              <div key={`${executive.name}-${year}`} className="flex items-center justify-between p-4 rounded border border-[color:var(--terminal-border)] hover:border-[color:var(--terminal-accent)] transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 rounded bg-[color:var(--terminal-accent)]/10">
                    <Briefcase className="w-5 h-5 text-[color:var(--terminal-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[color:var(--terminal-text-primary)] font-mono">
                      {executive.name}
                    </h3>
                    <p className="text-[color:var(--terminal-text-secondary)]">
                      {executive.title}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-xs text-[color:var(--terminal-text-secondary)] mb-1">Cash</p>
                    <p className="font-mono font-bold text-[color:var(--terminal-text-primary)]">
                      {formatCurrency(executive.cashCompensation)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--terminal-text-secondary)] mb-1">Equity</p>
                    <p className="font-mono font-bold text-[color:var(--terminal-success)]">
                      {formatCurrency(executive.equityCompensation)}
                    </p>
                  </div>
                  {executive.cryptoCompensation && executive.cryptoCompensation > 0 && (
                    <div>
                      <p className="text-xs text-[color:var(--terminal-text-secondary)] mb-1">Crypto</p>
                      <p className="font-mono font-bold text-[color:var(--terminal-warning)]">
                        {formatCurrency(executive.cryptoCompensation)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-[color:var(--terminal-text-secondary)] mb-1">Total</p>
                    <p className="font-mono font-bold text-[color:var(--terminal-accent)]">
                      {formatCurrency(executive.totalCompensation)}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-[color:var(--terminal-text-secondary)] mb-1">Shares Owned</p>
                  <p className="font-mono font-bold text-[color:var(--terminal-text-primary)]">
                    {executive.sharesOwned.toLocaleString()}
                  </p>
                  <p className="text-xs text-[color:var(--terminal-text-muted)]">
                    {executive.optionsOutstanding.toLocaleString()} options
                  </p>
                </div>

                <div className="flex space-x-2">
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditExecutive(executive)}
                    icon={<Edit3 className="w-4 h-4" />}
                  />
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteExecutive(executive)}
                    icon={<Trash2 className="w-4 h-4" />}
                    className="text-[color:var(--terminal-danger)]"
                  />
                </div>
              </div>
            ))}

            {executivesByYear[year].length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-[color:var(--terminal-text-muted)] mx-auto mb-4" />
                <p className="text-[color:var(--terminal-text-secondary)] font-mono">
                  No executive compensation data for {year}
                </p>
              </div>
            )}
          </div>
        </TerminalCard>
      ))}

      {/* Summary Analytics */}
      <TerminalCard title="Compensation Analysis">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)]">
              Compensation Mix
            </h4>
            {currentYearExecutives.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--terminal-text-primary)]">Cash:</span>
                  <span className="font-mono">
                    {((currentYearExecutives.reduce((sum, exec) => sum + exec.cashCompensation, 0) / getTotalCompensation()) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[color:var(--terminal-text-primary)]">Equity:</span>
                  <span className="font-mono">
                    {((getTotalEquityValue() / getTotalCompensation()) * 100).toFixed(1)}%
                  </span>
                </div>
                {getTotalCryptoCompensation() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[color:var(--terminal-text-primary)]">Crypto:</span>
                    <span className="font-mono">
                      {((getTotalCryptoCompensation() / getTotalCompensation()) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)]">
              Equity Holdings
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--terminal-text-primary)]">Total Shares:</span>
                <span className="font-mono">
                  {currentYearExecutives.reduce((sum, exec) => sum + exec.sharesOwned, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--terminal-text-primary)]">Outstanding Options:</span>
                <span className="font-mono">
                  {currentYearExecutives.reduce((sum, exec) => sum + exec.optionsOutstanding, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--terminal-text-primary)]">% of Shares:</span>
                <span className="font-mono">
                  {((currentYearExecutives.reduce((sum, exec) => sum + exec.sharesOwned, 0) / company.sharesOutstanding) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)]">
              Average Compensation
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--terminal-text-primary)]">Per Executive:</span>
                <span className="font-mono">
                  {formatCurrency(currentYearExecutives.length > 0 ? getTotalCompensation() / currentYearExecutives.length : 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--terminal-text-primary)]">Cash Component:</span>
                <span className="font-mono">
                  {formatCurrency(currentYearExecutives.length > 0 ? currentYearExecutives.reduce((sum, exec) => sum + exec.cashCompensation, 0) / currentYearExecutives.length : 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[color:var(--terminal-text-primary)]">Equity Component:</span>
                <span className="font-mono">
                  {formatCurrency(currentYearExecutives.length > 0 ? getTotalEquityValue() / currentYearExecutives.length : 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </TerminalCard>

      {/* Executive Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono mb-6">
              {editingExecutive ? 'Edit Executive' : 'Add Executive'}
            </h3>
            
            <div className="grid grid-cols-2 gap-6">
              <TerminalInput
                label="Name *"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Executive name"
              />
              
              <TerminalInput
                label="Title *"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Chief Executive Officer"
              />

              <TerminalInput
                label="Year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                placeholder="Compensation year"
              />

              <TerminalInput
                label="Cash Compensation"
                type="number"
                value={formData.cashCompensation}
                onChange={(e) => setFormData(prev => ({ ...prev, cashCompensation: parseFloat(e.target.value) || 0 }))}
                placeholder="Base salary + bonuses"
              />

              <TerminalInput
                label="Equity Compensation"
                type="number"
                value={formData.equityCompensation}
                onChange={(e) => setFormData(prev => ({ ...prev, equityCompensation: parseFloat(e.target.value) || 0 }))}
                placeholder="Stock grants, RSUs, etc."
              />

              <TerminalInput
                label="Crypto Compensation"
                type="number"
                value={formData.cryptoCompensation}
                onChange={(e) => setFormData(prev => ({ ...prev, cryptoCompensation: parseFloat(e.target.value) || 0 }))}
                placeholder="Digital asset compensation"
              />

              <TerminalInput
                label="Shares Owned"
                type="number"
                value={formData.sharesOwned}
                onChange={(e) => setFormData(prev => ({ ...prev, sharesOwned: parseFloat(e.target.value) || 0 }))}
                placeholder="Direct share ownership"
              />

              <TerminalInput
                label="Options Outstanding"
                type="number"
                value={formData.optionsOutstanding}
                onChange={(e) => setFormData(prev => ({ ...prev, optionsOutstanding: parseFloat(e.target.value) || 0 }))}
                placeholder="Unexercised stock options"
              />
            </div>

            <div className="mt-6 p-4 rounded bg-[color:var(--terminal-accent)]/10 border border-[color:var(--terminal-accent)]/20">
              <p className="text-sm text-[color:var(--terminal-text-secondary)] mb-2">Total Compensation:</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                {formatCurrency(formData.cashCompensation + formData.equityCompensation + formData.cryptoCompensation)}
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <TerminalButton
                variant="ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={handleSaveExecutive}
                disabled={!formData.name.trim() || !formData.title.trim()}
                className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
              >
                {editingExecutive ? 'Update' : 'Add'} Executive
              </TerminalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}