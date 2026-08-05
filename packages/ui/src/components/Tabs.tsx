'use client';

import React, { createContext, useContext, useState, useRef, useId } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
  baseId: string;
  registerTrigger: (value: string, ref: HTMLButtonElement | null) => void;
  triggersRef: React.MutableRefObject<Map<string, HTMLButtonElement>>;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = ''
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalTab;
  const baseId = useId();
  const triggersRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const setActiveTab = (newValue: string) => {
    if (value === undefined) {
      setInternalTab(newValue);
    }
    onValueChange?.(newValue);
  };

  const registerTrigger = (val: string, ref: HTMLButtonElement | null) => {
    if (ref) {
      triggersRef.current.set(val, ref);
    } else {
      triggersRef.current.delete(val);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId, registerTrigger, triggersRef }}>
      <div className={`w-full space-y-4 ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!context) return;
    const triggers = Array.from(context.triggersRef.current.entries()).filter(
      ([, el]) => !el.disabled
    );

    if (triggers.length === 0) return;

    const currentIndex = triggers.findIndex(([val]) => val === context.activeTab);
    let newIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % triggers.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + triggers.length) % triggers.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = triggers.length - 1;
    } else {
      return;
    }

    const target = triggers[newIndex];
    if (target) {
      const [newVal, newEl] = target;
      context.setActiveTab(newVal);
      newEl?.focus();
    }
  };

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={`inline-flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl gap-1 ${className}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = '',
  disabled = false
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isSelected = context.activeTab === value;
  const triggerId = `${context.baseId}-tab-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;

  return (
    <button
      ref={(el) => context.registerTrigger(value, el)}
      id={triggerId}
      role="tab"
      type="button"
      disabled={disabled}
      tabIndex={isSelected ? 0 : -1}
      aria-selected={isSelected}
      aria-controls={panelId}
      onClick={() => context.setActiveTab(value)}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all select-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
        isSelected
          ? 'bg-blue-600 text-white shadow-sm font-semibold'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = ''
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  const triggerId = `${context.baseId}-tab-${value}`;
  const panelId = `${context.baseId}-panel-${value}`;
  const isSelected = context.activeTab === value;

  if (!isSelected) return null;

  return (
    <div
      id={panelId}
      role="tabpanel"
      tabIndex={0}
      aria-labelledby={triggerId}
      className={`outline-none animate-in fade-in-50 duration-150 ${className}`}
    >
      {children}
    </div>
  );
}
