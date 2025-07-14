import { Suspense } from 'react';
import CompanyPageClient from './CompanyPageClient';

interface CompanyPageProps {
  params: Promise<{
    ticker: string;
  }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { ticker } = await params;
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-black p-6 flex items-center justify-center">
      <div className="text-green-400">Loading...</div>
    </div>}>
      <CompanyPageClient ticker={ticker} />
    </Suspense>
  );
}