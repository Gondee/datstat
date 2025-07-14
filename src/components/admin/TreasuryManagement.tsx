'use client';

import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Plus, 
  Edit3, 
  Trash2, 
  Download, 
  Upload,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { TerminalCard, TerminalButton, TerminalInput } from '@/components/ui';
import { Company, TreasuryHolding, TreasuryTransaction, CryptoType, FundingMethod } from '@/types';

interface TreasuryManagementProps {
  company: Company;
  onUpdateTreasury: (treasury: TreasuryHolding[]) => void;
}

interface TransactionFormData {
  date: string;
  crypto: CryptoType;
  amount: number;
  pricePerUnit: number;
  type: 'purchase' | 'sale' | 'stake' | 'unstake';
  fundingMethod?: FundingMethod;
  notes: string;
}

export default function TreasuryManagement({ company, onUpdateTreasury }: TreasuryManagementProps) {
  const [selectedHolding, setSelectedHolding] = useState<TreasuryHolding | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TreasuryTransaction | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<{
    crypto?: CryptoType;
    type?: string;
    dateRange?: { start: string; end: string };
  }>({});

  const [formData, setFormData] = useState<TransactionFormData>({
    date: new Date().toISOString().split('T')[0],
    crypto: 'BTC',
    amount: 0,
    pricePerUnit: 0,
    type: 'purchase',
    fundingMethod: 'equity',
    notes: ''
  });

  const [csvData, setCsvData] = useState('');
  const [importPreview, setImportPreview] = useState<TransactionFormData[]>([]);

  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        date: editingTransaction.date.split('T')[0],
        crypto: selectedHolding?.crypto || 'BTC',
        amount: editingTransaction.amount,
        pricePerUnit: editingTransaction.pricePerUnit,
        type: editingTransaction.type,
        fundingMethod: editingTransaction.fundingMethod,
        notes: editingTransaction.notes || ''
      });
    } else {
      setFormData({
        date: new Date().toISOString().split('T')[0],
        crypto: 'BTC',
        amount: 0,
        pricePerUnit: 0,
        type: 'purchase',
        fundingMethod: 'equity',
        notes: ''
      });
    }
  }, [editingTransaction, selectedHolding]);

  const calculateTotalValue = () => {
    return company.treasury.reduce((total, holding) => total + holding.currentValue, 0);
  };

  const calculateUnrealizedGain = () => {
    return company.treasury.reduce((total, holding) => total + holding.unrealizedGain, 0);
  };

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setSelectedHolding(null);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (holding: TreasuryHolding, transaction: TreasuryTransaction) => {
    setSelectedHolding(holding);
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleSaveTransaction = () => {
    const newTransaction: TreasuryTransaction = {
      id: editingTransaction?.id || `tx_${Date.now()}`,
      date: new Date(formData.date).toISOString(),
      amount: formData.amount,
      pricePerUnit: formData.pricePerUnit,
      totalCost: formData.amount * formData.pricePerUnit,
      type: formData.type,
      fundingMethod: formData.fundingMethod,
      notes: formData.notes
    };

    const updatedTreasury = [...company.treasury];
    let holdingIndex = updatedTreasury.findIndex(h => h.crypto === formData.crypto);

    if (holdingIndex === -1) {
      // Create new holding
      const newHolding: TreasuryHolding = {
        crypto: formData.crypto,
        amount: formData.type === 'purchase' ? formData.amount : 0,
        averageCostBasis: formData.pricePerUnit,
        totalCost: newTransaction.totalCost,
        currentValue: formData.amount * formData.pricePerUnit, // This would be updated with real-time prices
        unrealizedGain: 0,
        unrealizedGainPercent: 0,
        transactions: [newTransaction]
      };
      updatedTreasury.push(newHolding);
    } else {
      // Update existing holding
      const holding = updatedTreasury[holdingIndex];
      const transactions = editingTransaction 
        ? holding.transactions.map(t => t.id === editingTransaction.id ? newTransaction : t)
        : [...holding.transactions, newTransaction];

      // Recalculate holding metrics
      const totalAmount = transactions.reduce((sum, t) => {
        return t.type === 'purchase' || t.type === 'stake' 
          ? sum + t.amount 
          : sum - t.amount;
      }, 0);

      const totalCost = transactions.reduce((sum, t) => {
        return t.type === 'purchase' || t.type === 'stake' 
          ? sum + t.totalCost 
          : sum - t.totalCost;
      }, 0);

      const averageCostBasis = totalAmount > 0 ? totalCost / totalAmount : 0;

      updatedTreasury[holdingIndex] = {
        ...holding,
        amount: totalAmount,
        averageCostBasis,
        totalCost,
        transactions
      };
    }

    onUpdateTreasury(updatedTreasury);
    setShowTransactionModal(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (holding: TreasuryHolding, transactionId: string) => {
    const updatedTreasury = company.treasury.map(h => {
      if (h.crypto === holding.crypto) {
        const updatedTransactions = h.transactions.filter(t => t.id !== transactionId);
        
        // Recalculate metrics
        const totalAmount = updatedTransactions.reduce((sum, t) => {
          return t.type === 'purchase' || t.type === 'stake' 
            ? sum + t.amount 
            : sum - t.amount;
        }, 0);

        const totalCost = updatedTransactions.reduce((sum, t) => {
          return t.type === 'purchase' || t.type === 'stake' 
            ? sum + t.totalCost 
            : sum - t.totalCost;
        }, 0);

        return {
          ...h,
          amount: totalAmount,
          totalCost,
          averageCostBasis: totalAmount > 0 ? totalCost / totalAmount : 0,
          transactions: updatedTransactions
        };
      }
      return h;
    }).filter(h => h.amount > 0); // Remove holdings with zero amount

    onUpdateTreasury(updatedTreasury);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Crypto', 'Type', 'Amount', 'Price Per Unit', 'Total Cost', 'Funding Method', 'Notes'];
    const rows = company.treasury.flatMap(holding =>
      holding.transactions.map(tx => [
        tx.date,
        holding.crypto,
        tx.type,
        tx.amount,
        tx.pricePerUnit,
        tx.totalCost,
        tx.fundingMethod || '',
        tx.notes || ''
      ])
    );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company.ticker}_treasury_transactions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (csv: string): TransactionFormData[] => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      return {
        date: row.date || new Date().toISOString().split('T')[0],
        crypto: (row.crypto || 'BTC') as CryptoType,
        amount: parseFloat(row.amount) || 0,
        pricePerUnit: parseFloat(row['price per unit'] || row.price) || 0,
        type: (row.type || 'purchase') as 'purchase' | 'sale' | 'stake' | 'unstake',
        fundingMethod: row['funding method'] as FundingMethod,
        notes: row.notes || ''
      };
    });
  };

  const handleImportPreview = () => {
    const parsed = parseCSV(csvData);
    setImportPreview(parsed);
  };

  const confirmImport = () => {
    importPreview.forEach(tx => {
      setFormData(tx);
      handleSaveTransaction();
    });
    setShowBulkImport(false);
    setCsvData('');
    setImportPreview([]);
  };

  const getAllTransactions = () => {
    return company.treasury.flatMap(holding =>
      holding.transactions.map(tx => ({
        ...tx,
        crypto: holding.crypto
      }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredTransactions = getAllTransactions().filter(tx => {
    if (transactionFilter.crypto && tx.crypto !== transactionFilter.crypto) return false;
    if (transactionFilter.type && tx.type !== transactionFilter.type) return false;
    if (transactionFilter.dateRange) {
      const txDate = new Date(tx.date);
      const start = new Date(transactionFilter.dateRange.start);
      const end = new Date(transactionFilter.dateRange.end);
      if (txDate < start || txDate > end) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Treasury Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Total Value</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                ${calculateTotalValue().toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Assets</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {company.treasury.length}
              </p>
            </div>
            <Coins className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Unrealized P&L</p>
              <p className={`text-2xl font-bold font-mono ${
                calculateUnrealizedGain() >= 0 
                  ? 'text-[color:var(--terminal-success)]' 
                  : 'text-[color:var(--terminal-danger)]'
              }`}>
                ${calculateUnrealizedGain().toLocaleString()}
              </p>
            </div>
            {calculateUnrealizedGain() >= 0 ? (
              <TrendingUp className="w-8 h-8 text-[color:var(--terminal-success)]" />
            ) : (
              <TrendingDown className="w-8 h-8 text-[color:var(--terminal-danger)]" />
            )}
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Transactions</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {getAllTransactions().length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
          Treasury Holdings
        </h2>
        <div className="flex space-x-3">
          <TerminalButton
            variant="ghost"
            onClick={() => setShowBulkImport(true)}
            icon={<Upload className="w-4 h-4" />}
          >
            Import CSV
          </TerminalButton>
          <TerminalButton
            variant="ghost"
            onClick={exportToCSV}
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </TerminalButton>
          <TerminalButton
            onClick={handleAddTransaction}
            icon={<Plus className="w-4 h-4" />}
            className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
          >
            Add Transaction
          </TerminalButton>
        </div>
      </div>

      {/* Holdings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {company.treasury.map((holding) => (
          <TerminalCard key={holding.crypto} className="hover:border-[color:var(--terminal-accent)] transition-colors">
            <div className="space-y-4">
              {/* Holding Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded bg-[color:var(--terminal-accent)]/10">
                    <Coins className="w-5 h-5 text-[color:var(--terminal-accent)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[color:var(--terminal-text-primary)] font-mono">
                      {holding.crypto}
                    </h3>
                    <p className="text-sm text-[color:var(--terminal-text-secondary)]">
                      {holding.amount.toLocaleString()} coins
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[color:var(--terminal-accent)] font-mono">
                    ${holding.currentValue.toLocaleString()}
                  </p>
                  <p className={`text-sm font-mono ${
                    holding.unrealizedGain >= 0 
                      ? 'text-[color:var(--terminal-success)]' 
                      : 'text-[color:var(--terminal-danger)]'
                  }`}>
                    ${holding.unrealizedGain.toLocaleString()} ({holding.unrealizedGainPercent.toFixed(1)}%)
                  </p>
                </div>
              </div>

              {/* Holding Metrics */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-[color:var(--terminal-text-secondary)]">Avg Cost</p>
                  <p className="font-mono font-bold text-[color:var(--terminal-text-primary)]">
                    ${holding.averageCostBasis.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--terminal-text-secondary)]">Total Cost</p>
                  <p className="font-mono font-bold text-[color:var(--terminal-text-primary)]">
                    ${holding.totalCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--terminal-text-secondary)]">Transactions</p>
                  <p className="font-mono font-bold text-[color:var(--terminal-text-primary)]">
                    {holding.transactions.length}
                  </p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="space-y-2">
                <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)]">
                  Recent Transactions
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {holding.transactions.slice(0, 3).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-mono ${
                          tx.type === 'purchase' || tx.type === 'stake'
                            ? 'bg-[color:var(--terminal-success)]/10 text-[color:var(--terminal-success)]'
                            : 'bg-[color:var(--terminal-danger)]/10 text-[color:var(--terminal-danger)]'
                        }`}>
                          {tx.type.toUpperCase()}
                        </span>
                        <span className="text-[color:var(--terminal-text-secondary)]">
                          {new Date(tx.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[color:var(--terminal-text-primary)]">
                          {tx.amount.toLocaleString()} @ ${tx.pricePerUnit.toLocaleString()}
                        </span>
                        <div className="flex space-x-1">
                          <TerminalButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTransaction(holding, tx)}
                            icon={<Edit3 className="w-3 h-3" />}
                          />
                          <TerminalButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTransaction(holding, tx.id)}
                            icon={<Trash2 className="w-3 h-3" />}
                            className="text-[color:var(--terminal-danger)]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TerminalCard>
        ))}
      </div>

      {/* Transaction History */}
      <TerminalCard title="Transaction History">
        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <div className="flex-1">
            <select
              value={transactionFilter.crypto || ''}
              onChange={(e) => setTransactionFilter(prev => ({ 
                ...prev, 
                crypto: e.target.value as CryptoType || undefined 
              }))}
              className="w-full bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded px-3 py-2 text-[color:var(--terminal-text-primary)] font-mono"
            >
              <option value="">All Assets</option>
              <option value="BTC">Bitcoin</option>
              <option value="ETH">Ethereum</option>
              <option value="SOL">Solana</option>
            </select>
          </div>
          <div className="flex-1">
            <select
              value={transactionFilter.type || ''}
              onChange={(e) => setTransactionFilter(prev => ({ 
                ...prev, 
                type: e.target.value || undefined 
              }))}
              className="w-full bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded px-3 py-2 text-[color:var(--terminal-text-primary)] font-mono"
            >
              <option value="">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
              <option value="stake">Stake</option>
              <option value="unstake">Unstake</option>
            </select>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
            const holding = company.treasury.find(h => h.crypto === tx.crypto);
            return (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded border border-[color:var(--terminal-border)] hover:border-[color:var(--terminal-accent)] transition-colors">
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                    tx.type === 'purchase' || tx.type === 'stake'
                      ? 'bg-[color:var(--terminal-success)]/10 text-[color:var(--terminal-success)]'
                      : 'bg-[color:var(--terminal-danger)]/10 text-[color:var(--terminal-danger)]'
                  }`}>
                    {tx.type.toUpperCase()}
                  </span>
                  <div>
                    <p className="font-mono text-[color:var(--terminal-text-primary)]">
                      {tx.amount.toLocaleString()} {tx.crypto}
                    </p>
                    <p className="text-sm text-[color:var(--terminal-text-secondary)]">
                      {new Date(tx.date).toLocaleDateString()} • ${tx.pricePerUnit.toLocaleString()} per unit
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="font-mono font-bold text-[color:var(--terminal-text-primary)]">
                      ${tx.totalCost.toLocaleString()}
                    </p>
                    {tx.fundingMethod && (
                      <p className="text-sm text-[color:var(--terminal-text-secondary)]">
                        {tx.fundingMethod.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => holding && handleEditTransaction(holding, tx)}
                      icon={<Edit3 className="w-4 h-4" />}
                    />
                    <TerminalButton
                      variant="ghost"
                      size="sm"
                      onClick={() => holding && handleDeleteTransaction(holding, tx.id)}
                      icon={<Trash2 className="w-4 h-4" />}
                      className="text-[color:var(--terminal-danger)]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </TerminalCard>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowTransactionModal(false)} />
          <div className="relative bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono mb-6">
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </h3>
            
            <div className="space-y-4">
              <TerminalInput
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
              
              <div>
                <label className="block text-sm font-mono text-[color:var(--terminal-text-primary)] mb-2">
                  Cryptocurrency
                </label>
                <select
                  value={formData.crypto}
                  onChange={(e) => setFormData(prev => ({ ...prev, crypto: e.target.value as CryptoType }))}
                  className="w-full bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded px-3 py-2 text-[color:var(--terminal-text-primary)] font-mono"
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono text-[color:var(--terminal-text-primary)] mb-2">
                  Transaction Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded px-3 py-2 text-[color:var(--terminal-text-primary)] font-mono"
                >
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                  <option value="stake">Stake</option>
                  <option value="unstake">Unstake</option>
                </select>
              </div>

              <TerminalInput
                label="Amount"
                type="number"
                step="0.00000001"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="Number of coins/tokens"
              />

              <TerminalInput
                label="Price Per Unit"
                type="number"
                step="0.01"
                value={formData.pricePerUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, pricePerUnit: parseFloat(e.target.value) || 0 }))}
                placeholder="Price per coin/token"
              />

              <div>
                <label className="block text-sm font-mono text-[color:var(--terminal-text-primary)] mb-2">
                  Funding Method
                </label>
                <select
                  value={formData.fundingMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, fundingMethod: e.target.value as FundingMethod }))}
                  className="w-full bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded px-3 py-2 text-[color:var(--terminal-text-primary)] font-mono"
                >
                  <option value="equity">Equity</option>
                  <option value="convertible_debt">Convertible Debt</option>
                  <option value="credit_facility">Credit Facility</option>
                  <option value="pipe">PIPE</option>
                  <option value="at_the_market">At The Market</option>
                </select>
              </div>

              <TerminalInput
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this transaction"
              />

              <div className="p-3 rounded bg-[color:var(--terminal-accent)]/10 border border-[color:var(--terminal-accent)]/20">
                <p className="text-sm text-[color:var(--terminal-text-secondary)] mb-1">Total Cost:</p>
                <p className="text-lg font-bold text-[color:var(--terminal-accent)] font-mono">
                  ${(formData.amount * formData.pricePerUnit).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <TerminalButton
                variant="ghost"
                onClick={() => setShowTransactionModal(false)}
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={handleSaveTransaction}
                className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
              >
                {editingTransaction ? 'Update' : 'Add'} Transaction
              </TerminalButton>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowBulkImport(false)} />
          <div className="relative bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-[color:var(--terminal-text-primary)] font-mono mb-6">
              Bulk Import Transactions
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-mono text-[color:var(--terminal-text-primary)] mb-2">
                  CSV Data (Date, Crypto, Type, Amount, Price Per Unit, Funding Method, Notes)
                </label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Date,Crypto,Type,Amount,Price Per Unit,Funding Method,Notes&#10;2024-01-01,BTC,purchase,1.5,45000,equity,Initial purchase"
                  className="w-full h-32 bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded px-3 py-2 text-[color:var(--terminal-text-primary)] font-mono text-sm"
                />
              </div>

              <div className="flex space-x-3">
                <TerminalButton
                  onClick={handleImportPreview}
                  disabled={!csvData.trim()}
                >
                  Preview Import
                </TerminalButton>
              </div>

              {importPreview.length > 0 && (
                <div>
                  <h4 className="text-sm font-mono text-[color:var(--terminal-text-secondary)] mb-2">
                    Preview ({importPreview.length} transactions)
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {importPreview.map((tx, index) => (
                      <div key={index} className="text-xs font-mono text-[color:var(--terminal-text-primary)] p-2 rounded border border-[color:var(--terminal-border)]">
                        {tx.date} • {tx.crypto} • {tx.type} • {tx.amount} @ ${tx.pricePerUnit}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <TerminalButton
                variant="ghost"
                onClick={() => setShowBulkImport(false)}
              >
                Cancel
              </TerminalButton>
              <TerminalButton
                onClick={confirmImport}
                disabled={importPreview.length === 0}
                className="bg-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/80"
              >
                Import {importPreview.length} Transactions
              </TerminalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}