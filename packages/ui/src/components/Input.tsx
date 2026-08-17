import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      id,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const isInvalid = Boolean(errorMessage);

    const baseInputClasses =
      'w-full bg-surface text-foreground placeholder:text-muted-foreground border rounded-lg text-sm font-interface transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted';

    const borderClasses = isInvalid
      ? 'border-destructive focus:ring-destructive'
      : 'border-border hover:brightness-95 focus:border-ring';

    const paddingClasses = `${leftIcon ? 'pl-10' : 'pl-3.5'} ${rightIcon ? 'pr-10' : 'pr-3.5'} py-2.5`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span
              className="absolute left-3 text-muted-foreground pointer-events-none flex items-center justify-center"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={isInvalid}
            aria-describedby={
              isInvalid ? errorId : helperText ? helperId : undefined
            }
            className={`${baseInputClasses} ${borderClasses} ${paddingClasses} ${className}`}
            {...props}
          />

          {rightIcon && (
            <span
              className="absolute right-3 text-muted-foreground pointer-events-none flex items-center justify-center"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </div>

        {errorMessage && (
          <p id={errorId} className="text-xs text-destructive font-medium">
            {errorMessage}
          </p>
        )}

        {!errorMessage && helperText && (
          <p id={helperId} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
