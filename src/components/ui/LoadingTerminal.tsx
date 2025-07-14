'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface LoadingTerminalProps {
  message?: string;
  steps?: string[];
  className?: string;
}

export const LoadingTerminal: React.FC<LoadingTerminalProps> = ({
  message = 'Loading data...',
  steps,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Cycle through steps if provided
  useEffect(() => {
    if (!steps || steps.length === 0) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [steps]);

  const loadingChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCharIndex((prev) => (prev + 1) % loadingChars.length);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        'bg-black border border-green-500/30 rounded-sm p-6 font-mono',
        className
      )}
    >
      <div className="space-y-2">
        {/* Terminal header */}
        <div className="text-xs text-green-600 mb-4">
          {'>'} SYSTEM PROCESS
        </div>

        {/* Main loading message */}
        <div className="text-green-400">
          <span className="mr-2">{loadingChars[charIndex]}</span>
          {steps ? steps[currentStep] : message}
          <span className="text-green-600">{dots}</span>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-1 bg-green-900/30 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 animate-loading-bar" />
          </div>
        </div>

        {/* Additional terminal-style output */}
        <div className="mt-4 text-xs text-green-600 space-y-1">
          <div>[SYS] Establishing connection...</div>
          <div>[SYS] Authenticating...</div>
          <div>[SYS] Fetching data streams...</div>
          <div className="animate-pulse">[SYS] Processing{dots}</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 50%;
            margin-left: 25%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }

        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};