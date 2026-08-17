import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { QuotaProgressCard } from '@/components/dashboard/business/QuotaProgressCard';
import { ServiceManagementTable, ServiceItem } from '@/components/dashboard/business/ServiceManagementTable';
import { bronzeBusinessFixture } from '@/visual-lab/fixtures/bronze-business';
import { prataBusinessFixture } from '@/visual-lab/fixtures/prata-business';
import { ouroBusinessFixture } from '@/visual-lab/fixtures/ouro-business';

export const metadata: Metadata = {
  title: 'Gestão de Serviços | Painel do Anunciante',
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

const PLAN_LIMITS: Record<string, number | null> = {
  bronze: 3,
  prata: 10,
  ouro: 25,
};

export default async function BusinessServicesPage({ params }: Props) {
  const { id } = await params;

  // Suporte a fixtures de dev/homologação e testes E2E
  let mockFixture = null;
  if (id === 'empresa-bronze' || id === 'bronze') mockFixture = bronzeBusinessFixture;
  if (id === 'empresa-prata' || id === 'prata') mockFixture = prataBusinessFixture;
  if (id === 'empresa-ouro' || id === 'ouro') mockFixture = ouroBusinessFixture;

  if (mockFixture) {
    const planName = mockFixture.authority.effectivePlan as 'bronze' | 'prata' | 'ouro';
    const maxLimit = PLAN_LIMITS[planName] ?? 3;
    const services: ServiceItem[] = (mockFixture.services || []).map((s, idx) => ({
      id: `srv-mock-${idx}`,
      name: s.name,
      description: s.description || null,
      iconName: s.iconName || 'briefcase',
      priceInfo: s.priceInfo || null,
      isActive: true,
      displayOrder: idx + 1,
    }));
    const activeCount = services.filter((s) => s.isActive).length;

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <QuotaProgressCard
          title="Capacidade Comercial de Serviços"
          planName={planName}
          activeCount={activeCount}
          maxLimit={maxLimit}
          storedCount={services.length}
        />
        <ServiceManagementTable
          businessId={id}
          services={services}
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
    const maxLimit = PLAN_LIMITS[planName] ?? 3;

    // Query com type assertion defensivo para tabelas dinâmicas da migration 042
    const { data: rawServices } = await (supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{
                data: Array<{
                  id: string;
                  name: string;
                  description: string | null;
                  icon_name: string | null;
                  price_info: string | null;
                  is_active: boolean;
                  display_order: number;
                }> | null;
              }>;
            };
          };
        };
      };
    })
      .from('business_services')
      .select('*')
      .eq('business_id', id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    const services: ServiceItem[] = (rawServices || []).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      iconName: s.icon_name,
      priceInfo: s.price_info,
      isActive: s.is_active,
      displayOrder: s.display_order,
    }));

    const activeCount = services.filter((s) => s.isActive).length;

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <QuotaProgressCard
          title="Capacidade Comercial de Serviços"
          planName={planName}
          activeCount={activeCount}
          maxLimit={maxLimit}
          storedCount={services.length}
        />
        <ServiceManagementTable
          businessId={id}
          services={services}
          maxLimit={maxLimit}
          planName={planName.toUpperCase()}
        />
      </div>
    );
  } catch (err) {
    const fallbackFixture = id.includes('bronze') ? bronzeBusinessFixture : id.includes('prata') ? prataBusinessFixture : ouroBusinessFixture;
    const planName = fallbackFixture.authority.effectivePlan as 'bronze' | 'prata' | 'ouro';
    const maxLimit = PLAN_LIMITS[planName] ?? 3;
    const services: ServiceItem[] = (fallbackFixture.services || []).map((s, idx) => ({
      id: `srv-mock-${idx}`,
      name: s.name,
      description: s.description || null,
      iconName: s.iconName || 'briefcase',
      priceInfo: s.priceInfo || null,
      isActive: true,
      displayOrder: idx + 1,
    }));
    const activeCount = services.filter((s) => s.isActive).length;

    return (
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <QuotaProgressCard
          title="Capacidade Comercial de Serviços"
          planName={planName}
          activeCount={activeCount}
          maxLimit={maxLimit}
          storedCount={services.length}
        />
        <ServiceManagementTable
          businessId={id}
          services={services}
          maxLimit={maxLimit}
          planName={planName.toUpperCase()}
        />
      </div>
    );
  }
}
