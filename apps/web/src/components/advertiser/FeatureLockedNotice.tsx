import Link from 'next/link';
import { Lock } from 'lucide-react';

/** Página de um recurso que o plano da empresa não inclui (a rota também não aparece no menu). */
export function FeatureLockedNotice({ feature, planName }: { feature: string; planName: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        <Lock className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-4 font-serif text-xl font-bold text-stone-900">{feature} não está incluído no plano {planName}</h1>
      <p className="mt-2 text-sm text-stone-600">
        Este recurso faz parte de planos superiores. Veja o que cada plano oferece e faça o upgrade quando quiser.
      </p>
      <Link
        href="/anunciante/plano"
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--member-primary,#5d1523)] px-5 text-sm font-bold text-[var(--member-primary-fg,#fff)]"
      >
        Ver meu plano
      </Link>
    </div>
  );
}
