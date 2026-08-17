
'use client';
import React from 'react';
import { NavigationSnapshot, NavigationItem } from '@saas/sdk';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { useSidebar } from './SidebarContext';

interface SidebarProps {
  navigation: NavigationSnapshot;
  activePath?: string;
}

function resolveIcon(name?: string) {
  if (!name) return null;
  
  const pascalName = name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalName];
  if (IconComponent) {
    return <IconComponent className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-200" />;
  }
  
  return <Icons.HelpCircle className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110 duration-200" />;
}

function NavItem({ item, activePath, depth = 0 }: { item: NavigationItem; activePath?: string; depth?: number }) {
  const isActive = activePath === item.path || activePath?.startsWith(item.path + '/');
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="space-y-1">
      <Link
        href={item.path}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
          isActive
            ? "bg-primary text-primary-foreground shadow-semanticSm"
            : "text-secondary hover:bg-accent-subtle hover:text-accent",
          depth > 0 && "pl-6"
        )}
      >
        {resolveIcon(item.icon)}
        <span className="flex-1 truncate">{item.label}</span>
        {hasChildren && (
          <Icons.ChevronRight className={cn(
            "h-3.5 w-3.5 opacity-60 transition-transform duration-200",
            isActive ? "rotate-90" : "group-hover:translate-x-0.5"
          )} />
        )}
      </Link>
      
      {hasChildren && isActive && (
        <div className="border-l border-default/60 ml-5 mt-1 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {item.children?.map((child) => (
            <NavItem key={child.id} item={child} activePath={activePath} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ navigation, activePath = '/' }: SidebarProps) {
  const { isOpen } = useSidebar();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-primary/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => {}}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "hidden w-64 flex-col border-r border-default bg-secondary text-primary md:flex shrink-0 transition-all duration-300 z-50",
        isOpen ? "fixed inset-y-0 left-0 md:static md:relative animate-in slide-in-from-left duration-300" : "md:block"
      )}>
        {/* Brand Header */}
        <div className="flex h-16 items-center px-6 border-b border-default font-semibold text-lg tracking-tight bg-tertiary">
          <Icons.Shield className="h-5 w-5 mr-2 text-accent" />
          <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">CivicOS</span>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-4 px-4">
            {navigation.groups.map(group => (
              <div key={group.id} className="space-y-1.5">
                {group.label && (
                  <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-secondary">
                    {group.label}
                  </h4>
                )}
                <div className="grid gap-0.5">
                  {group.items.map((item: NavigationItem) => (
                    <NavItem key={item.id} item={item} activePath={activePath} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
