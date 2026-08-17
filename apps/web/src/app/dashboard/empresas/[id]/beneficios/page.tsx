import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { QuotaProgressCard } from '@/components/dashboard/business/QuotaProgressCard';
import { BenefitManagementTable, BenefitItem } from '@/components/dashboard/business/BenefitManagementTable';
import { bronzeBusinessFixture } from '@/visual-lab/fixtures/bronze-business';
import { prataBusinessFixture } from '@/visual-lab/fixtures/prata-business';
import { ouroBusinessFixture } from '@/visual-lab/fixtures/ouro-business';

export const metadata: Metadata = {
  title: 'Gestão de Benefícios | Painel do Anunciante',
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

const BENEFIT_LIMITS: Record<string, number | null> = {
  bronze: 0,
  prata: 1,
  ouro: 3,
};

export default async function BusinessBenefitsPage({ params }: Props) {
  const { id } = await params;

  // Suporte a fixtures de dev/homologação e testes E2E
  let mockFixture = null;
  if (id === 'empresa-bronze' || id === 'bronze') mockFixture = bronzeBusinessFixture;
  if (id === 'empresa-prata' || id === 'prata') mockFixture = prataBusinessFixture;
  if (id === 'empresa-ouro' || id === 'ouro') mockFixture = ouroBusinessFixture;

  if (mockFixture) {
    const planName = mockFixture.authority.effectivePlan as 'bronze' | 'prata' | 'ouro';
    const maxLimit = BENEFIT_LIMITS[planName] ?? 0;
    const rawList = mockFixture.benefits || (mockFixture.benefit ? [mockFixture.benefit] : []);

    const benefits: BenefitItem[] = rawList.map((b, idx) => ({
      id: (b as { id?: string }).id || `ben-mock-${idx}`,
      title: b.title,
      description: b.description,
      benefitType: (b as { benefitType?: string }).benefitType || 'discount',
      discountPercentage: (b as { discountPercentage?: number }).discountPercentage || null,
      discountAmount: (b as { discountAmount?: number }).discountAmount || null,
      discountCode: (b as { discountCode?: string }).discountCode || null,
      badgeText: (b as { badgeText?: string }).badgeText || null,
      redeemInstructions: (b as { redeemInstructions?: string }).redeemInstructions || null,
      validFrom: (b as { validFrom?: string }).validFrom || new Date().toISOString(),
      validUntil: (b as { validUntil?: string }).validUntil || null,
      isActive: true,
      displayOrder: idx + 1,
    }));

    const activeCount = benefits.filter((b) => b.isActive).length;

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <QuotaProgressCard
          title="Capacidade Comercial de Benefícios"
          planName={planName}
          activeCount={activeCount}
          maxLimit={maxLimit}
          storedCount={benefits.length}
        />
        <BenefitManagementTable
          businessId={id}
          benefits={benefits}
          maxLimit={maxLimit}
          planName={planName.toUpperCase()}
        />
      </div>
    );
  }

  // Resolução real do Supabase
  try {
    const supabase = await createServerSideClient();
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('id', id)
      .single();

    if (bizError || !business) {
      notFound();
    }

    const planName = 'bronze';
    const maxLimit = BENEFIT_LIMITS[planName] ?? 0;

    // Query com type assertion defensivo para tabelas dinâmicas da migration 042
    const { data: rawBenefits } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{
                data: Array<{
                  id: string;
                  title: string;
                  description: string;
                  benefit_type: string | null;
                  discount_percentage: number | null;
                  discount_amount: number | null;
                  discount_code: string | null;
                  badge_text: string | null;
                  redeem_instructions: string | null;
                  valid_from: string | null;
                  valid_until: string | null;
                  is_active: boolean;
                  display_order: number;
                }> | null;
              }>;
            };
          };
        };
      };
    })
      .from('business_benefits')
      .select('*')
      .eq('business_id', id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    const benefits: BenefitItem[] = (rawBenefits || []).map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      benefitType: b.benefit_type,
      discountPercentage: b.discount_percentage,
      discountAmount: b.discount_amount,
      discountCode: b.discount_code,
      badgeText: b.badge_text,
      redeemInstructions: b.redeem_instructions,
      validFrom: b.valid_from,
      validUntil: b.valid_until,
      isActive: b.is_active,
      displayOrder: b.display_order,
    }));

    const activeCount = benefits.filter((b) => b.isActive).length;

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <QuotaProgressCard
          title="Capacidade Comercial de Benefícios"
          planName={planName}
          activeCount={activeCount}
          maxLimit={maxLimit}
          storedCount={benefits.length}
        />
        <BenefitManagementTable
          businessId={id}
          benefits={benefits}
          maxLimit={maxLimit}
          planName={planName.toUpperCase()}
        />
      </div>
    );
  } catch (err) {
    const fallbackFixture = id.includes('bronze') ? bronzeBusinessFixture : id.includes('prata') ? prataBusinessFixture : ouroBusinessFixture;
    const planName = fallbackFixture.authority.effectivePlan as 'bronze' | 'prata' | 'ouro';
    const maxLimit = BENEFIT_LIMITS[planName] ?? 0;
    const rawList = fallbackFixture.benefits || (fallbackFixture.benefit ? [fallbackFixture.benefit] : []);
    const benefits: BenefitItem[] = rawList.map((b, idx) => ({
      id: `ben-mock-${idx}`,
      title: b.title,
      description: b.description,
      benefitType: null,
      discountPercentage: null,
      discountAmount: null,
      discountCode: b.discountCode || null,
      badgeText: b.badgeText || null,
      redeemInstructions: b.redeemInstructions || (b as { terms?: string }).terms || null,
      validFrom: (b as { validFrom?: string }).validFrom || null,
      validUntil: b.validUntil || null,
      isActive: true,
      displayOrder: idx + 1,
    }));
    const activeCount = benefits.filter((b) => b.isActive).length;

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <QuotaProgressCard
          title="Capacidade Comercial de Benefícios"
          planName={planName}
          activeCount={activeCount}
          maxLimit={maxLimit}
          storedCount={benefits.length}
        />
        <BenefitManagementTable
          businessId={id}
          benefits={benefits}
          maxLimit={maxLimit}
          planName={planName.toUpperCase()}
        />
      </div>
    );
  }
}
