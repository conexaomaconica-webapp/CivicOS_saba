import React from 'react';
import Link from 'next/link';
import type { PresentationSnapshot } from '@saas/core';

export interface NavigationRendererProps {
  items: PresentationSnapshot['navigation'];
}

export function NavigationRenderer({ items }: NavigationRendererProps) {
  if (!items || items.length === 0) {
    return null;
  }

  // The presentation snapshot provides a flat list of navigation items.
  // We need to build a tree based on parentId.
  const rootItems = items.filter(item => !item.parentId).sort((a, b) => a.priority - b.priority);
  const getChildren = (parentId: string) => items.filter(item => item.parentId === parentId).sort((a, b) => a.priority - b.priority);

  const renderItem = (item: PresentationSnapshot['navigation'][number]) => {
    const children = getChildren(item.id);
    return (
      <div key={item.id}>
        <Link
          href={item.path}
          className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          {item.label}
        </Link>
        {children.length > 0 && (
          <div className="pl-4 mt-1 space-y-1">
            {children.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="flex flex-col space-y-1">
      {rootItems.map(renderItem)}
    </nav>
  );
}
