'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Activity,
  FileText,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { TerminalCard, TerminalButton, TerminalInput } from '@/components/ui';
import { Company, CryptoPrice } from '@/types';

interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'manual' | 'file';
  status: 'active' | 'error' | 'pending';
  lastUpdate: string;
  nextUpdate?: string;
  description: string;
}

interface ManualDataEntry {
  id: string;
  companyTicker: string;
  dataType: string;
  currentValue: string;
  lastUpdated: string;
  updatedBy: string;
  notes?: string;
}

export default function DataManagement() {
  const [, setCompanies] = useState<Company[]>([]);
  const [, setCryptoPrices] = useState<Record<string, CryptoPrice>>({});
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [manualEntries, setManualEntries] = useState<ManualDataEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<ManualDataEntry | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Mock data load
  useEffect(() => {
    const loadData = async () => {
      try {
        const { companies: mockCompanies, cryptoPrices: mockPrices } = await import('@/data/mockData');
        setCompanies(mockCompanies);
        setCryptoPrices(mockPrices);

        // Mock data sources
        setDataSources([
          {
            id: 'coinapi',
            name: 'CoinAPI',
            type: 'api',
            status: 'active',
            lastUpdate: '2 minutes ago',
            nextUpdate: 'In 28 minutes',
            description: 'Real-time cryptocurrency price feeds'
          },
          {
            id: 'sec-edgar',
            name: 'SEC EDGAR',
            type: 'api',
            status: 'active',
            lastUpdate: '1 hour ago',
            nextUpdate: 'In 23 hours',
            description: 'Company filings and financial statements'
          },
          {
            id: 'manual-treasury',
            name: 'Manual Treasury Data',
            type: 'manual',
            status: 'pending',
            lastUpdate: '6 hours ago',
            description: 'Manually entered treasury holdings and transactions'
          },
          {
            id: 'compensation-data',
            name: 'Executive Compensation',
            type: 'file',
            status: 'error',
            lastUpdate: '2 days ago',
            description: 'Executive compensation and governance data'
          }
        ]);

        // Mock manual entries
        setManualEntries([
          {
            id: 'entry-1',
            companyTicker: 'MSTR',
            dataType: 'Bitcoin Holdings',
            currentValue: '189,150 BTC',
            lastUpdated: '2024-07-14 09:30:00',
            updatedBy: 'Admin',
            notes: 'Updated from Q2 2024 earnings report'
          },
          {
            id: 'entry-2',
            companyTicker: 'DFDV',
            dataType: 'SOL Staking Yield',
            currentValue: '6.8%',
            lastUpdated: '2024-07-13 16:45:00',
            updatedBy: 'Admin',
            notes: 'Validator commission rate updated'
          },
          {
            id: 'entry-3',
            companyTicker: 'UPXI',
            dataType: 'Warrant Exercise Price',
            currentValue: '$2.28',
            lastUpdated: '2024-07-12 11:20:00',
            updatedBy: 'Admin',
            notes: 'PIPE financing warrant terms'
          },
          {
            id: 'entry-4',
            companyTicker: 'SBET',
            dataType: 'ETH Staking Amount',
            currentValue: '6,000 ETH',
            lastUpdated: '2024-07-11 14:15:00',
            updatedBy: 'Admin'
          }
        ]);

      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-[color:var(--terminal-success)]" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-[color:var(--terminal-danger)]" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-[color:var(--terminal-warning)]" />;
      default:
        return <Activity className="w-4 h-4 text-[color:var(--terminal-text-secondary)]" />;
    }
  };

  const handleEditEntry = (entry: ManualDataEntry) => {
    setSelectedEntry(entry);
    setEditValue(entry.currentValue);
    setEditMode(true);
  };

  const handleSaveEntry = () => {
    if (selectedEntry) {
      const updatedEntries = manualEntries.map(entry =>
        entry.id === selectedEntry.id
          ? {
              ...entry,
              currentValue: editValue,
              lastUpdated: new Date().toISOString().slice(0, 19).replace('T', ' '),
              updatedBy: 'Admin'
            }
          : entry
      );
      setManualEntries(updatedEntries);
      setEditMode(false);
      setSelectedEntry(null);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setSelectedEntry(null);
    setEditValue('');
  };

  const handleRefreshData = async (sourceId: string) => {
    // Mock refresh - in production this would trigger actual data refresh
    setDataSources(sources =>
      sources.map(source =>
        source.id === sourceId
          ? { ...source, status: 'active', lastUpdate: 'Just now' }
          : source
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[color:var(--terminal-text-secondary)] font-mono">
          Loading data management...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[color:var(--terminal-accent)] font-mono">
          Data Management
        </h1>
        <p className="text-[color:var(--terminal-text-secondary)] mt-2">
          Manage data sources, manual entries, and system integrations
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Data Sources</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-text-primary)] font-mono">
                {dataSources.length}
              </p>
            </div>
            <Database className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Manual Entries</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
                {manualEntries.length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-[color:var(--terminal-accent)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Active Sources</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-success)] font-mono">
                {dataSources.filter(s => s.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-[color:var(--terminal-success)]" />
          </div>
        </TerminalCard>

        <TerminalCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[color:var(--terminal-text-secondary)] text-sm">Errors</p>
              <p className="text-2xl font-bold text-[color:var(--terminal-danger)] font-mono">
                {dataSources.filter(s => s.status === 'error').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-[color:var(--terminal-danger)]" />
          </div>
        </TerminalCard>
      </div>

      {/* Data Sources */}
      <TerminalCard title="Data Sources">
        <div className="space-y-4">
          {dataSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-4 rounded border border-[color:var(--terminal-border)] hover:bg-[color:var(--terminal-accent)]/5 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(source.status)}
                  <span className="text-[color:var(--terminal-text-primary)] font-mono font-bold">
                    {source.name}
                  </span>
                </div>
                <div className="text-[color:var(--terminal-text-secondary)] text-sm">
                  {source.description}
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-[color:var(--terminal-text-secondary)] text-xs">
                    Last updated: {source.lastUpdate}
                  </div>
                  {source.nextUpdate && (
                    <div className="text-[color:var(--terminal-text-muted)] text-xs">
                      Next: {source.nextUpdate}
                    </div>
                  )}
                </div>

                <TerminalButton
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRefreshData(source.id)}
                  icon={<RefreshCw className="w-4 h-4" />}
                  className="text-[color:var(--terminal-primary)] hover:bg-[color:var(--terminal-primary)]/10"
                >
                  Refresh
                </TerminalButton>
              </div>
            </div>
          ))}
        </div>
      </TerminalCard>

      {/* Manual Data Entries */}
      <TerminalCard title="Manual Data Entries">
        <div className="space-y-4">
          {manualEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 rounded border border-[color:var(--terminal-border)] hover:bg-[color:var(--terminal-accent)]/5 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex items-center space-x-3">
                  <span className="text-[color:var(--terminal-accent)] font-mono font-bold">
                    {entry.companyTicker}
                  </span>
                  <span className="text-[color:var(--terminal-text-primary)]">
                    {entry.dataType}
                  </span>
                </div>

                <div className="flex-1">
                  {editMode && selectedEntry?.id === entry.id ? (
                    <div className="flex items-center space-x-2">
                      <TerminalInput
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                      />
                      <TerminalButton
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveEntry}
                        icon={<Save className="w-4 h-4" />}
                        className="text-[color:var(--terminal-success)] hover:bg-[color:var(--terminal-success)]/10"
                      >
                        Save
                      </TerminalButton>
                      <TerminalButton
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        icon={<X className="w-4 h-4" />}
                        className="text-[color:var(--terminal-danger)] hover:bg-[color:var(--terminal-danger)]/10"
                      >
                        Cancel
                      </TerminalButton>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <span className="text-[color:var(--terminal-text-primary)] font-mono font-bold">
                        {entry.currentValue}
                      </span>
                      {entry.notes && (
                        <span className="text-[color:var(--terminal-text-muted)] text-sm">
                          - {entry.notes}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right text-sm">
                  <div className="text-[color:var(--terminal-text-secondary)]">
                    {new Date(entry.lastUpdated).toLocaleDateString()}
                  </div>
                  <div className="text-[color:var(--terminal-text-muted)]">
                    by {entry.updatedBy}
                  </div>
                </div>

                {!(editMode && selectedEntry?.id === entry.id) && (
                  <TerminalButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditEntry(entry)}
                    icon={<Edit3 className="w-4 h-4" />}
                    className="text-[color:var(--terminal-primary)] hover:bg-[color:var(--terminal-primary)]/10"
                  >
                    Edit
                  </TerminalButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </TerminalCard>

      {/* Data Import/Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TerminalCard title="Data Import">
          <div className="space-y-4">
            <p className="text-[color:var(--terminal-text-secondary)] text-sm">
              Import company data, treasury holdings, or financial metrics from CSV files.
            </p>
            <div className="space-y-3">
              <TerminalButton
                icon={<Upload className="w-4 h-4" />}
                className="w-full justify-start"
              >
                Import Company Data (CSV)
              </TerminalButton>
              <TerminalButton
                icon={<Upload className="w-4 h-4" />}
                className="w-full justify-start"
              >
                Import Treasury Holdings (CSV)
              </TerminalButton>
              <TerminalButton
                icon={<Upload className="w-4 h-4" />}
                className="w-full justify-start"
              >
                Import Executive Compensation (CSV)
              </TerminalButton>
            </div>
          </div>
        </TerminalCard>

        <TerminalCard title="Data Export">
          <div className="space-y-4">
            <p className="text-[color:var(--terminal-text-secondary)] text-sm">
              Export current data for analysis, backup, or integration with external systems.
            </p>
            <div className="space-y-3">
              <TerminalButton
                icon={<Download className="w-4 h-4" />}
                className="w-full justify-start"
              >
                Export All Companies (CSV)
              </TerminalButton>
              <TerminalButton
                icon={<Download className="w-4 h-4" />}
                className="w-full justify-start"
              >
                Export Treasury Data (JSON)
              </TerminalButton>
              <TerminalButton
                icon={<Download className="w-4 h-4" />}
                className="w-full justify-start"
              >
                Export Institutional Metrics (CSV)
              </TerminalButton>
            </div>
          </div>
        </TerminalCard>
      </div>
    </div>
  );
}