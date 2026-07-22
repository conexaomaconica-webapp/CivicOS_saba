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
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-4 md:px-6 backdrop-blur-md transition-all duration-300">
      {/* Title & Context */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          {context?.community && (
            <span className="text-[10px] text-primary font-bold uppercase tracking-wider mb-0.5">
              {context.community}
            </span>
          )}
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            {context?.title || 'CivicOS'}
          </h1>
          {context?.location && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
              <MapPin className="h-3 w-3 text-primary" /> {context.location}
            </span>
          )}
          {context?.subtitle && !context?.location && (
            <span className="text-xs text-muted-foreground mt-0.5">
              {context.subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons & Avatar */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Search" className="h-9 w-9 hover:bg-muted/80 rounded-full">
          <Search className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="h-9 w-9 hover:bg-muted/80 rounded-full">
          <Bell className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </Button>
        
        {/* Theme Toggle Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleTheme} 
          aria-label="Toggle Theme"
          className="h-9 w-9 hover:bg-muted/80 rounded-full transition-transform active:scale-95 duration-100"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4 text-muted-foreground hover:text-foreground transition-all duration-300 rotate-0" />
          ) : (
            <Sun className="h-4 w-4 text-yellow-500 hover:text-yellow-400 transition-all duration-300 rotate-180 scale-110" />
          )}
        </Button>

        <div className="h-8 w-px bg-border mx-1.5" />

        <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all duration-200">
          <AvatarImage src="" alt="User" />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
