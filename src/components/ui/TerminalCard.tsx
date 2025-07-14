import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface TerminalCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  actions?: ReactNode;
  variant?: 'default' | 'compact' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function TerminalCard({
  children,
  title,
  className,
  actions,
  variant = 'default',
  padding = 'md',
}: TerminalCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'bg-black border-green-500/50',
        variant === 'default' && 'border rounded-lg',
        variant === 'compact' && 'border-l-2 pl-4',
        variant === 'bordered' && 'border-2 rounded-lg shadow-lg shadow-green-500/20',
        className
      )}
    >
      {title && (
        <div className="border-b border-green-500/30 pb-2 mb-4 flex items-center justify-between">
          <h3 className="text-green-400 font-semibold text-sm uppercase tracking-wider">
            {title}
          </h3>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      )}
      <div className={cn(paddingClasses[padding])}>{children}</div>
    </div>
  );
}