import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TerminalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const TerminalButton = forwardRef<HTMLButtonElement, TerminalButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-mono font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--terminal-accent)] focus:ring-offset-2 focus:ring-offset-[color:var(--terminal-black)] disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-[color:var(--terminal-accent)] text-[color:var(--terminal-black)] border border-[color:var(--terminal-accent)] hover:bg-[color:var(--terminal-accent-light)] hover:border-[color:var(--terminal-accent-light)]',
      secondary: 'bg-transparent text-[color:var(--terminal-accent)] border border-[color:var(--terminal-border)] hover:bg-[color:var(--terminal-accent)]/10 hover:border-[color:var(--terminal-accent)]',
      danger: 'bg-[color:var(--terminal-danger)] text-white border border-[color:var(--terminal-danger)] hover:bg-[color:var(--terminal-danger)]/80 hover:border-[color:var(--terminal-danger)]/80',
      ghost: 'bg-transparent text-[color:var(--terminal-accent)] border border-transparent hover:bg-[color:var(--terminal-accent)]/10',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-6 py-3 text-base rounded-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : icon ? (
          <span className="mr-2">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

TerminalButton.displayName = 'TerminalButton';