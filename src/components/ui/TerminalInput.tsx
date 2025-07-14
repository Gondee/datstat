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
          <label className="block text-xs font-medium text-green-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        
        <div className="relative">
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500/70 text-sm font-mono">
              {prefix}
            </div>
          )}
          
          <input
            ref={ref}
            className={cn(
              'w-full bg-black border border-green-500/50 rounded-md px-3 py-2 font-mono text-sm text-green-100 placeholder-green-500/50',
              'focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-400',
              prefix && 'pl-8',
              suffix && 'pr-8',
              className
            )}
            {...props}
          />
          
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500/70 text-sm font-mono">
              {suffix}
            </div>
          )}
        </div>
        
        {error ? (
          <p className="text-xs text-red-400 font-mono">{error}</p>
        ) : hint ? (
          <p className="text-xs text-green-500/70 font-mono">{hint}</p>
        ) : null}
      </div>
    );
  }
);

TerminalInput.displayName = 'TerminalInput';