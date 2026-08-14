
'use client';
import React from 'react';
import { NavigationSnapshot, NavigationItem } from '@saas/sdk';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface BottomNavigationProps {
  navigation: NavigationSnapshot;
  activePath?: string;
}

/**
 * Resolves Lucide icon components dynamically
 */
function resolveIcon(name?: string) {
  if (!name) return null;

  const pascalName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalName];
  if (IconComponent) {
    return <IconComponent className="h-5 w-5 transition-transform duration-200" />;
  }

  return <Icons.HelpCircle className="h-5 w-5 transition-transform duration-200" />;
}

export function BottomNavigation({ navigation, activePath = '/' }: BottomNavigationProps) {
  // Extract up to 5 main navigation items for mobile
  const mainGroup = navigation.groups.find(g => g.id === 'main');
  const items = mainGroup?.items.slice(0, 5) || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-around border-t border-default bg-secondary text-primary px-2 pb-[env(safe-area-inset-bottom)] md:hidden backdrop-blur-md bg-opacity-95 shadow-lg">
      {items.map((item: NavigationItem) => {
        const isActive = activePath === item.path || activePath.startsWith(item.path + '/');

        return (
          <Link
            key={item.id}
            href={item.path}
            className={cn(
              "relative flex flex-col items-center justify-center w-full h-full gap-0.5 transition-all duration-200",
              isActive
                ? "text-accent scale-105"
                : "text-secondary hover:text-primary"
            )}
          >
            {/* Active Indicator Top Dot */}
            {isActive && (
              <span className="absolute top-1.5 h-1 w-1 rounded-full bg-accent animate-in zoom-in duration-300" />
            )}

            {/* Icon */}
            <div className={cn(
              "p-1 rounded-full transition-colors duration-200",
              isActive ? "bg-accent-subtle" : "group-hover:bg-tertiary"
            )}>
              {resolveIcon(item.icon || item.capability)}
            </div>

            {/* Label */}
            <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
