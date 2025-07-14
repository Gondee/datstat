'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TerminalCard, TerminalButton, TerminalInput } from '@/components/ui';
import { Lock, User, Shield } from 'lucide-react';

export default function LoginPage() {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        await response.json();
        // Redirect to admin dashboard
        router.push('/admin');
      } else {
        const error = await response.json();
        setError(error.message || 'Invalid credentials');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--terminal-black)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <TerminalCard className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-[color:var(--terminal-accent)]/10 border border-[color:var(--terminal-accent)]/20">
                <Shield className="w-8 h-8 text-[color:var(--terminal-accent)]" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--terminal-accent)] font-mono">
              DATstat Admin
            </h1>
            <p className="text-[color:var(--terminal-text-secondary)] text-sm mt-2">
              Secure access to administration panel
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <TerminalInput
                  label="Email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                  className="pl-10"
                />
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--terminal-text-secondary)] mt-3" />
              </div>
            </div>

            <div>
              <div className="relative">
                <TerminalInput
                  label="Password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className="pl-10"
                />
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--terminal-text-secondary)] mt-3" />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-[color:var(--terminal-danger)]/10 border border-[color:var(--terminal-danger)]/20">
                <p className="text-[color:var(--terminal-danger)] text-sm font-mono">
                  {error}
                </p>
              </div>
            )}

            <TerminalButton
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </TerminalButton>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[color:var(--terminal-border)]">
            <p className="text-center text-xs text-[color:var(--terminal-text-muted)]">
              Authorized personnel only • All access logged
            </p>
          </div>
        </TerminalCard>
      </div>
    </div>
  );
}