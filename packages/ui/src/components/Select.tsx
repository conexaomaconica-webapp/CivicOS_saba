import React from 'react';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  helperText?: string;
  errorMessage?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, helperText, errorMessage, id, disabled, className = '', ...props }, ref) => {
    const selectId = id || React.useId();
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;
    const isInvalid = Boolean(errorMessage);

    const baseClasses =
      'w-full bg-slate-900 text-slate-100 border rounded-lg text-sm px-3.5 py-2.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-10 cursor-pointer';

    const borderClasses = isInvalid
      ? 'border-rose-500 focus:ring-rose-500'
      : 'border-slate-700 hover:border-slate-600 focus:border-blue-500';

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-slate-300">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? errorId : helperText ? helperId : undefined}
            className={`${baseClasses} ${borderClasses} ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Chevron Dropdown Arrow */}
          <span className="absolute right-3 pointer-events-none text-slate-400" aria-hidden="true">
            ▼
          </span>
        </div>

        {errorMessage && (
          <p id={errorId} className="text-xs text-rose-400 font-medium">
            {errorMessage}
          </p>
        )}

        {!errorMessage && helperText && (
          <p id={helperId} className="text-xs text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
