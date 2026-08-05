import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const baseClasses =
    'bg-slate-800/80 animate-pulse rounded select-none pointer-events-none motion-reduce:animate-none';

  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full shrink-0',
    rectangular: 'w-full rounded-xl'
  };

  const inlineStyles: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
    ...style
  };

  return (
    <div
      aria-hidden="true"
      tabIndex={-1}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={inlineStyles}
      {...props}
    />
  );
}
