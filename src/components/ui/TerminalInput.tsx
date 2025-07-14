import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface TerminalInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

export const TerminalInput = forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ className, label, error, hint, prefix, suffix, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs font-medium text-[color:var(--terminal-accent)] uppercase tracking-wider">
            {label}
          </label>
        )}
        
        <div className="relative">
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--terminal-text-secondary)] text-sm font-mono">
              {prefix}
            </div>
          )}
          
          <input
            ref={ref}
            className={cn(
              'w-full bg-[color:var(--terminal-surface)] border border-[color:var(--terminal-border)] rounded-md px-3 py-2 font-mono text-sm text-[color:var(--terminal-text-primary)] placeholder-[color:var(--terminal-text-secondary)]',
              'focus:outline-none focus:ring-2 focus:ring-[color:var(--terminal-accent)] focus:border-[color:var(--terminal-accent)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-400',
              prefix && 'pl-8',
              suffix && 'pr-8',
              className
            )}
            {...props}
          />
          
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--terminal-text-secondary)] text-sm font-mono">
              {suffix}
            </div>
          )}
        </div>
        
        {error ? (
          <p className="text-xs text-red-400 font-mono">{error}</p>
        ) : hint ? (
          <p className="text-xs text-[color:var(--terminal-text-secondary)] font-mono">{hint}</p>
        ) : null}
      </div>
    );
  }
);

TerminalInput.displayName = 'TerminalInput';