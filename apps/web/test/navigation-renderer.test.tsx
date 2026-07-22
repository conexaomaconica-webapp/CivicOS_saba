import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { NavigationRenderer } from '../src/components/navigation/NavigationRenderer';
import { NavigationSnapshot } from '@saas/sdk';

// Using mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/'
}));

describe('NavigationRenderer', () => {
  it('should strictly render the provided NavigationSnapshot', () => {
    const mockSnapshot: NavigationSnapshot = {
      groups: [
        {
          id: 'main',
          items: [
            { id: 'home', label: 'Início', path: '/', capability: 'home', permissions: [] },
            { id: 'search', label: 'Buscar', path: '/search', capability: 'search', permissions: [] }
          ]
        }
      ]
    };

    const { getByText, queryByText } = render(
      <NavigationRenderer navigation={mockSnapshot}>
        <div>Conteúdo Principal</div>
      </NavigationRenderer>
    );

    // Should render shell and navigation items
    expect(getByText('Conteúdo Principal')).toBeDefined();
    expect(getByText('Início')).toBeDefined();
    expect(getByText('Buscar')).toBeDefined();
    
    // Should not try to guess plugin routes
    expect(queryByText('Configurações')).toBeNull();
  });
});
