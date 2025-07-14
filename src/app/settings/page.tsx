'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TerminalCard, TerminalButton } from '@/components/ui';

export default function SettingsPage() {
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
            <h1 className="text-3xl font-bold text-green-400 font-mono">Settings</h1>
            <p className="text-green-500/70">Application preferences and configuration</p>
          </div>
        </div>
      </div>

      <TerminalCard>
        <div className="text-center py-12">
          <h2 className="text-xl text-green-400 mb-4">Coming Soon</h2>
          <p className="text-green-500/70">
            Application settings and preferences will be available here.
          </p>
        </div>
      </TerminalCard>
    </div>
  );
}