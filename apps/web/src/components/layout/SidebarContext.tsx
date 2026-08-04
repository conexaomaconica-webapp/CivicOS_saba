'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    const handleRouteChange = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return (
    <SidebarContext.Provider value={{
      isOpen,
      toggle: () => setIsOpen(prev => !prev),
      close: () => setIsOpen(false),
      open: () => setIsOpen(true),
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}