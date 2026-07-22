import React from 'react';
import { NavigationSnapshot } from '@saas/sdk';
import { Sidebar } from '../layout/Sidebar';
import { Header, ContextHeader } from '../layout/Header';
import { BottomNavigation } from '../layout/BottomNavigation';
import { MainContent } from '../layout/MainContent';

export interface AppShellProps {
  navigation: NavigationSnapshot;
  activePath?: string;
  contextHeader?: ContextHeader;
  children: React.ReactNode;
}

export function AppShell({ navigation, activePath, contextHeader, children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar navigation={navigation} activePath={activePath} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header context={contextHeader} />
        
        <MainContent>
          {children}
        </MainContent>

        {/* Mobile Bottom Navigation */}
        <BottomNavigation navigation={navigation} activePath={activePath} />
      </div>
    </div>
  );
}
