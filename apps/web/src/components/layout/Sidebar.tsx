
'use client';
import React from 'react';
import { NavigationSnapshot, NavigationItem } from '@saas/sdk';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface SidebarProps {
  navigation: NavigationSnapshot;
  activePath?: string;
}

/**
 * Resolves Lucide icon components dynamically from icon names (e.g. 'home', 'settings')
 */
function resolveIcon(name?: string) {
  if (!name) return null;
  
  // Format slug/snake/kebab string to PascalCase
  const pascalName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalName];
  if (IconComponent) {
    return <IconComponent className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-200" />;
  }
  
  // Default fallback icon
  return <Icons.HelpCircle className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-200" />;
}

export function Sidebar({ navigation, activePath = '/' }: SidebarProps) {
  return (
    <aside className="hidden w-64 flex-col border-r bg-card text-card-foreground md:flex shrink-0 transition-all duration-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-border font-semibold text-lg tracking-tight bg-muted/20">
        <Icons.Shield className="h-5 w-5 mr-2 text-primary animate-pulse" />
        <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">CivicOS</span>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-4 px-4">
          {navigation.groups.map(group => (
            <div key={group.id} className="space-y-1.5">
              {group.label && (
                <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/75">
                  {group.label}
                </h4>
              )}
              <div className="grid gap-0.5">
                {group.items.map((item: NavigationItem) => {
                  const isActive = activePath === item.path || activePath.startsWith(item.path + '/');
                  
                  return (
                    <div key={item.id} className="space-y-1">
                      <Link
                        href={item.path}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {/* Dynamic Icon */}
                        {resolveIcon(item.icon)}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.children && item.children.length > 0 && (
                          <Icons.ChevronRight className={cn(
                            "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
                            isActive ? "rotate-90" : "group-hover:translate-x-0.5"
                          )} />
                        )}
                      </Link>
                      
                      {/* Sub-navigation items */}
                      {item.children && item.children.length > 0 && isActive && (
                        <div className="pl-6 border-l border-border/60 ml-5 mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          {item.children.map((child) => {
                            const isChildActive = activePath === child.path;
                            return (
                              <Link
                                key={child.id}
                                href={child.path}
                                className={cn(
                                  "group flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
                                  isChildActive 
                                    ? "text-primary bg-primary/5 font-semibold" 
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                )}
                              >
                                {resolveIcon(child.icon)}
                                <span className="truncate">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
