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
    const baseClasses = 'inline-flex items-center justify-center font-mono font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-green-600 text-black border border-green-600 hover:bg-green-500 hover:border-green-500',
      secondary: 'bg-transparent text-green-400 border border-green-500/50 hover:bg-green-500/10 hover:border-green-400',
      danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-500 hover:border-red-500',
      ghost: 'bg-transparent text-green-400 border border-transparent hover:bg-green-500/10',
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