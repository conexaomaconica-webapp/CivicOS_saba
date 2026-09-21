// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ApprovalTable, ApprovalGrid } from '@/app/admin/aprovacoes/_components/ApprovalViews';
import { ApprovalDirectoryItem } from '@/lib/admin/admin-approval-service';

afterEach(cleanup);

describe('ApprovalViews', () => {
  const missingDataItem: ApprovalDirectoryItem = {
    id: '123',
    tenant_id: 'tenant-1',
    name: null,
    category: null,
    publication_status: 'draft',
    owner_email: undefined,
    owner_name: undefined,
    plan_code: null,
    created_at: new Date().toISOString(),
    is_founder: false,
    is_pedra_fundamental: false,
    is_coluna_honra: false,
    has_responsible: false,
    has_business_data: false,
    has_masonic_link: false,
    has_signed_contract: false,
    has_valid_payment: false,
    is_ready_for_approval: false,
    completeness_percent: 0,
    cnpj: undefined,
    city: undefined,
  };

  it('renders ApprovalTable with missing fields properly using fallbacks visually', () => {
    render(
      <ApprovalTable items={[missingDataItem]} />
    );
    
    // Name missing should display "Empresa sem nome"
    expect(screen.getByText('Empresa sem nome')).toBeTruthy();
    
    // Category missing should display "Não informado"
    expect(screen.getAllByText('Não informado').length).toBeGreaterThan(0);
    
    // Owner name missing should display "Responsável não informado"
    expect(screen.getByText('Responsável não informado')).toBeTruthy();
    
    // Missing plan should display "Plano não definido"
    expect(screen.getByText('Plano não definido')).toBeTruthy();
  });

  it('renders ApprovalGrid with missing fields properly', () => {
    render(
      <ApprovalGrid items={[missingDataItem]} />
    );
    
    expect(screen.getByText('Empresa sem nome')).toBeTruthy();
    expect(screen.getByText('Responsável não informado')).toBeTruthy();
    expect(screen.getByText('Plano não definido')).toBeTruthy();
  });

  it('renders pending status for masonic link, contract and payment', () => {
    render(
      <ApprovalGrid items={[missingDataItem]} />
    );
    
    // Verify that the checklist does NOT show as validated
    expect(screen.queryByText('✓ Validado')).toBeNull();
    expect(screen.queryByText('✓ Assinado')).toBeNull();
    expect(screen.queryByText('✓ Confirmado')).toBeNull();
    
    // Should show Pendente and Ausente
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);
    expect(screen.getByText('Ausente')).toBeTruthy();
  });
});
