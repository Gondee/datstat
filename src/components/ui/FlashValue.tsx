'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';

interface FlashValueProps {
  value: number | string;
  className?: string;
  duration?: number;
  formatValue?: (value: number | string) => string;
}

export const FlashValue: React.FC<FlashValueProps> = ({
  value,
  className,
  duration = 500,
  formatValue,
}) => {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const prevValue = prevValueRef.current;
    
    if (typeof value === 'number' && typeof prevValue === 'number') {
      if (value > prevValue) {
        setFlash('up');
      } else if (value < prevValue) {
        setFlash('down');
      }
    } else if (value !== prevValue) {
      setFlash('up'); // Default to up for non-numeric changes
    }

    prevValueRef.current = value;

    if (flash) {
      const timer = setTimeout(() => setFlash(null), duration);
      return () => clearTimeout(timer);
    }
  }, [value, duration, flash]);

  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <span
      className={cn(
        'transition-all duration-200',
        flash === 'up' && 'text-green-300 animate-pulse',
        flash === 'down' && 'text-red-400 animate-pulse',
        className
      )}
    >
      {displayValue}
    </span>
  );
};