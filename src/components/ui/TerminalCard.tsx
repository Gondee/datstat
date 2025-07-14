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
        'bg-[color:var(--terminal-surface)] border-[color:var(--terminal-border)]',
        variant === 'default' && 'border rounded-lg',
        variant === 'compact' && 'border-l-2 pl-4',
        variant === 'bordered' && 'border-2 rounded-lg shadow-lg shadow-[color:var(--terminal-accent)]/10',
        className
      )}
    >
      {title && (
        <div className="border-b border-[color:var(--terminal-border)] pb-3 mb-4 flex items-center justify-between">
          <h3 className="text-[color:var(--terminal-primary)] font-semibold text-sm uppercase tracking-wider">
            {title}
          </h3>
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      )}
      <div className={cn(paddingClasses[padding])}>{children}</div>
    </div>
  );
}