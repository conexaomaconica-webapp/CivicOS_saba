import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgeCheck, Handshake, Hourglass, XCircle } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { listMyConnectionsAction, type ConnectionType } from '@/app/actions/connections';
import { RemoveConnectionPhotoButton } from '@/components/connections/RemoveConnectionPhotoButton';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'Minhas conexões | Conexão Maçônica' },
  robots: { index: false, follow: false },
};

const TYPE_LABEL: Record<ConnectionType, string> = {
  compra: 'Compra realizada',
  servico: 'Serviço contratado',
  parceria: 'Parceria realizada',
  visita: 'Visita realizada',
};

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default async function MyConnectionsPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fminha-conta%2Fconexoes');

  const result = await listMyConnectionsAction();
  const items = result.items;
  const confirmed = items.filter((item) => item.status === 'confirmada').length;

  return (
    <div>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[var(--member-primary)]">
              <Handshake className="h-6 w-6 text-[var(--member-accent)]" />
              Minhas conexões
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Compras, serviços e parcerias que você registrou. {confirmed > 0 ? `${confirmed} já confirmada${confirmed > 1 ? 's' : ''} pela empresa.` : 'Aparecem no mural da empresa quando ela confirmar.'}
            </p>
          </div>
          <Link href="/guia/empresas" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700">
            Explorar empresas
          </Link>
        </div>

        {!result.success && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{result.error}</div>}
        {result.success && items.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
            Você ainda não registrou nenhuma conexão. Na página de uma empresa, clique em <strong>Comprei na Conexão</strong>.
          </div>
        )}

        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              {item.photo_url && (
                <div className="flex flex-col items-start gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.photo_url} alt="Foto da conexão" className="h-16 w-16 rounded-lg object-cover" />
                  {item.photo_moderation_status === 'pendente' && (
                    <span className="text-[10px] font-semibold text-amber-700">Foto em análise</span>
                  )}
                  <RemoveConnectionPhotoButton connectionId={item.id} />
                </div>
              )}
              {!item.photo_url && item.photo_moderation_status === 'rejeitada' && (
                <span className="text-[10px] font-semibold text-stone-500">Foto não aprovada pela plataforma</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base font-bold text-stone-900">
                  {item.business_slug ? (
                    <Link href={`/guia/${item.business_slug}`} className="hover:underline">{item.business_name}</Link>
                  ) : (
                    item.business_name
                  )}
                </p>
                <p className="text-xs text-stone-600">
                  {TYPE_LABEL[item.connection_type]}
                  {item.item_description ? ` — ${item.item_description}` : ''} · {dateFmt.format(new Date(item.created_at))}
                </p>
              </div>
              {item.status === 'confirmada' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><BadgeCheck className="h-3.5 w-3.5" />Confirmada pela empresa</span>
              )}
              {item.status === 'pendente' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900"><Hourglass className="h-3.5 w-3.5" />Aguardando a empresa</span>
              )}
              {(item.status === 'recusada' || item.status === 'removida') && (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-stone-700"><XCircle className="h-3.5 w-3.5" />Não confirmada</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
