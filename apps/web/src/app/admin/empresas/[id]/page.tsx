import React from 'react';
import { notFound } from 'next/navigation';
import { getAdminBusiness360Action } from '@/lib/admin/admin-businesses-service';
import Company360Client from './company-360-client';

type AdminEmpresa360PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: AdminEmpresa360PageProps) {
  const { id } = await params;
  try {
    const dto = await getAdminBusiness360Action(id);
    if (!dto) return { title: 'Empresa não encontrada · Admin CM' };
    return { title: `Prontuário 360º: ${dto.business.name} · Conexão Maçônica Admin` };
  } catch (_err) {
    return { title: 'Prontuário 360º · Conexão Maçônica Admin' };
  }
}

export default async function AdminEmpresa360Page({ params }: AdminEmpresa360PageProps) {
  const { id } = await params;
  try {
    const dto = await getAdminBusiness360Action(id);
    if (!dto) {
      notFound();
    }
    return <Company360Client initialData={dto} />;
  } catch (_err) {
    notFound();
  }
}
