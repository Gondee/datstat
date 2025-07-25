'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2, 
  Database, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Shield,
  BarChart3,
  FileText
} from 'lucide-react';
import { TerminalButton } from '@/components/ui';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const router = useRouter();

  // Update timestamp on client side only to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString());
    };
    
    updateTime(); // Set initial time
    const interval = setInterval(updateTime, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'Companies', href: '/admin/companies', icon: Building2 },
    { name: 'Data Management', href: '/admin/data', icon: Database },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[color:var(--terminal-black)]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[color:var(--terminal-surface)] border-r border-[color:var(--terminal-border)] transform
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 transition-transform duration-300 ease-in-out
      `}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[color:var(--terminal-border)]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded bg-[color:var(--terminal-accent)]/10">
                <Shield className="w-6 h-6 text-[color:var(--terminal-accent)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[color:var(--terminal-accent)] font-mono">
                  DATstat Admin
                </h1>
                <p className="text-xs text-[color:var(--terminal-text-secondary)]">
                  Administration Panel
                </p>
              </div>
            </div>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-6 h-6 text-[color:var(--terminal-text-secondary)]" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-[color:var(--terminal-text-secondary)] hover:text-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent)]/10 transition-colors font-mono text-sm"
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-[color:var(--terminal-border)] space-y-3">
            <div className="flex items-center space-x-3 px-3 py-2 rounded-md bg-[color:var(--terminal-accent)]/5">
              <div className="p-1 rounded bg-[color:var(--terminal-accent)]/20">
                <Shield className="w-4 h-4 text-[color:var(--terminal-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono font-bold text-[color:var(--terminal-text-primary)] truncate">
                  Administrator
                </p>
                <p className="text-xs text-[color:var(--terminal-text-secondary)] truncate">
                  admin@datstat.com
                </p>
              </div>
            </div>
            <TerminalButton
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              icon={<LogOut className="w-4 h-4" />}
              className="w-full justify-start text-[color:var(--terminal-danger)] hover:bg-[color:var(--terminal-danger)]/10"
            >
              Sign Out
            </TerminalButton>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="bg-[color:var(--terminal-surface)] border-b border-[color:var(--terminal-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-[color:var(--terminal-text-secondary)]" />
            </button>
            <div className="text-[color:var(--terminal-text-secondary)] text-sm font-mono">
              Last updated: {currentTime || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}