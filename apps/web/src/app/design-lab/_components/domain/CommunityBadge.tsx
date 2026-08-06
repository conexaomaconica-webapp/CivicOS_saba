import React from 'react';
import { Badge } from '@saas/ui';

export interface CommunityBadgeProps {
  label: string;
  category?: 'connection' | 'verification' | 'recognition' | 'commercial';
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';
  icon?: React.ReactNode;
  description?: string;
  size?: 'sm' | 'md';
}

export function CommunityBadge({
  label,
  tone = 'info',
  icon,
  size = 'md'
}: CommunityBadgeProps) {
  return (
    <Badge variant={tone} size={size} icon={icon}>
      {label}
    </Badge>
  );
}
