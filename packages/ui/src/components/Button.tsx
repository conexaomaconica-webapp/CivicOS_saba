import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      onClick,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isIconOnly = size === 'icon';

    // Base classes
    const baseClasses =
      'inline-flex items-center justify-center font-medium font-interface transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100';

    // Size variants
    const sizeClasses = {
      sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5 min-h-[32px]',
      md: 'text-sm px-4 py-2 rounded-lg gap-2 min-h-[40px]',
      lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 min-h-[48px]',
      icon: 'p-2 rounded-lg min-w-[40px] min-h-[40px] aspect-square'
    };

    // Style variants using semantic tokens
    const variantClasses = {
      primary:
        'bg-primary text-primary-foreground shadow-semanticSm hover:brightness-110 active:brightness-90',
      secondary:
        'bg-secondary text-secondary-foreground border border-border hover:brightness-95 active:brightness-90',
      outline:
        'bg-transparent text-foreground border border-border hover:bg-muted active:brightness-95',
      ghost:
        'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:brightness-95',
      danger:
        'bg-destructive text-destructive-foreground shadow-semanticSm hover:brightness-110 active:brightness-90'
    };

    const isDisabled = disabled || loading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    const computedAriaLabel = props['aria-label'] || (isIconOnly && typeof children === 'string' ? children : undefined);

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        aria-label={computedAriaLabel}
        onClick={handleClick}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4 shrink-0 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
