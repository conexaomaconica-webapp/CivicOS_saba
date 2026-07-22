import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-16 md:pb-0">
      <div className="flex-1 h-full w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </main>
  );
}
