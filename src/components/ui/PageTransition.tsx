'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/utils/cn';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start with fade out
    setIsVisible(false);
    
    // Then fade in after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      className={cn(
        'transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {children}
    </div>
  );
};