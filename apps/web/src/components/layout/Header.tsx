import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Search, Moon, Sun, MapPin } from 'lucide-react';
import { useTheme } from '../../app/Providers';

export interface ContextHeader {
  title?: string;
  subtitle?: string;
  location?: string;
  community?: string;
}

interface HeaderProps {
  context?: ContextHeader;
}

export function Header({ context }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-default bg-primary/80 px-4 md:px-6 backdrop-blur-md transition-all duration-300">
      {/* Title & Context */}
      <div className="flex items-center gap-4">
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
