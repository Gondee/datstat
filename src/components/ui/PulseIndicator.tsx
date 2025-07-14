'use client';

import React from 'react';
import { cn } from '@/utils/cn';

interface PulseIndicatorProps {
  color?: 'green' | 'red' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PulseIndicator: React.FC<PulseIndicatorProps> = ({
  color = 'green',
  size = 'sm',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const colorClasses = {
    green: 'bg-green-400',
    red: 'bg-red-400',
    amber: 'bg-amber-400',
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'absolute inset-0 rounded-full animate-ping opacity-75',
          sizeClasses[size],
          colorClasses[color]
        )}
      />
      <div
        className={cn(
          'relative rounded-full',
          sizeClasses[size],
          colorClasses[color]
        )}
      />
    </div>
  );
};