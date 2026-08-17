import React from 'react';
import { NavigationSnapshot } from '@saas/sdk';
import { Sidebar } from '../layout/Sidebar';
import { ContextHeader } from '../layout/Header';
import { BottomNavigation } from '../layout/BottomNavigation';
import { MainContent } from '../layout/MainContent';
import { SidebarProvider, useSidebar } from '../layout/SidebarContext';
import { Menu, X, Bell, Search, Moon, Sun, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from '../../app/Providers';

function HeaderWithMenuToggle({ context }: { context?: ContextHeader }) {
  const { isOpen, toggle } = useSidebar();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-default bg-primary/80 px-4 md:px-6 backdrop-blur-md transition-all duration-300">
      {/* Title & Context */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggle}
          className="md:hidden p-2 rounded-lg hover:bg-tertiary transition-colors"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex flex-col">
          {context?.community && (
            <span className="text-[10px] text-secondary font-bold uppercase tracking-wider mb-0.5">
              {context.community}
            </span>
          )}
          <h1 className="text-base font-semibold tracking-tight text-primary">
            {context?.title || 'CivicOS'}
          </h1>
          {context?.location && (
            <span className="text-[11px] text-secondary flex items-center gap-1 mt-0.5 font-medium">
              <MapPin className="h-3 w-3 text-accent" /> {context.location}
            </span>
          )}
          {context?.subtitle && !context?.location && (
            <span className="text-xs text-secondary mt-0.5">
              {context.subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons & Avatar */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Search" className="h-9 w-9 hover:bg-tertiary rounded-full">
          <Search className="h-4 w-4 text-secondary hover:text-primary transition-colors" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="h-9 w-9 hover:bg-tertiary rounded-full">
          <Bell className="h-4 w-4 text-secondary hover:text-primary transition-colors" />
        </Button>
        
        {/* Theme Toggle Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          aria-label="Toggle Theme"
          className="h-9 w-9 hover:bg-tertiary rounded-full transition-transform active:scale-95 duration-100"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4 text-secondary hover:text-primary transition-all duration-300 rotate-0" />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground hover:text-foreground transition-all duration-300 rotate-180 scale-110" />
          )}
        </Button>

        <div className="h-8 w-px bg-[var(--border-default)] mx-1.5" />

        <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-accent/20 transition-all duration-200">
          <AvatarImage src="" alt="User" />
          <AvatarFallback className="bg-accent-subtle text-accent text-xs font-semibold">U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

export interface AppShellProps {
  navigation: NavigationSnapshot;
  activePath?: string;
  contextHeader?: ContextHeader;
  children: React.ReactNode;
}

export function AppShell({ navigation, activePath, contextHeader, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-primary text-primary">
        {/* Desktop Sidebar */}
        <Sidebar navigation={navigation} activePath={activePath} />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0">
          <HeaderWithMenuToggle context={contextHeader} />
          
          <MainContent>
            {children}
          </MainContent>

          {/* Mobile Bottom Navigation */}
          <BottomNavigation navigation={navigation} activePath={activePath} />
        </div>
      </div>
    </SidebarProvider>
  );
}
