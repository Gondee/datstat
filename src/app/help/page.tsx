'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TerminalCard, TerminalButton } from '@/components/ui';

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <TerminalButton
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </TerminalButton>
          
          <div>
            <h1 className="text-3xl font-bold text-green-400 font-mono">Help & Shortcuts</h1>
            <p className="text-green-500/70">Keyboard shortcuts and usage guide</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <TerminalCard title="Keyboard Shortcuts">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-green-400 font-semibold mb-3">Navigation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-500/70">Search companies:</span>
                    <kbd className="px-2 py-1 bg-green-500/20 rounded font-mono">/</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500/70">Command palette:</span>
                    <kbd className="px-2 py-1 bg-green-500/20 rounded font-mono">⌘K</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500/70">Dashboard:</span>
                    <kbd className="px-2 py-1 bg-green-500/20 rounded font-mono">h</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500/70">Compare:</span>
                    <kbd className="px-2 py-1 bg-green-500/20 rounded font-mono">c</kbd>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-green-400 font-semibold mb-3">Table Navigation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-500/70">Move up/down:</span>
                    <kbd className="px-2 py-1 bg-green-500/20 rounded font-mono">j/k</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500/70">Go to top:</span>
                    <kbd className="px-2 py-1 bg-green-500/20 rounded font-mono">gg</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500/70">Go to bottom:</span>
                    <kbd className="px-2 py-1 bg-green-500/20 rounded font-mono">G</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-500/70">Select row:</span>
                    <kbd className="px-2 py-1 bg-green-500/20 rounded font-mono">Enter</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TerminalCard>

        <TerminalCard title="About DATstat">
          <div className="space-y-4">
            <p className="text-green-100">
              DATstat is a Digital Asset Treasury Analytics Platform designed for tracking and analyzing
              publicly traded companies that hold cryptocurrency as treasury assets.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-green-400 font-semibold mb-2">Features</h3>
                <ul className="space-y-1 text-green-500/70 text-sm">
                  <li>{'•'} Real-time treasury tracking</li>
                  <li>{'•'} Premium to NAV calculations</li>
                  <li>{'•'} Performance comparisons</li>
                  <li>{'•'} Keyboard-driven interface</li>
                </ul>
              </div>
              <div>
                <h3 className="text-green-400 font-semibold mb-2">Tech Stack</h3>
                <ul className="space-y-1 text-green-500/70 text-sm">
                  <li>{'•'} Next.js 15 with TypeScript</li>
                  <li>{'•'} Zustand for state management</li>
                  <li>{'•'} Tailwind CSS for styling</li>
                  <li>{'•'} Recharts for visualizations</li>
                </ul>
              </div>
            </div>
          </div>
        </TerminalCard>
      </div>
    </div>
  );
}