'use client';

import { FormEvent, useRef, useState, useTransition } from 'react';
import { Camera, Loader2, Save, UserRound } from 'lucide-react';
import Image from 'next/image';
import { updateMemberProfileAction } from '@/lib/member/member-profile-service';
import { optimizeImageForUpload } from '@/lib/media/optimize-image';

type Profile = { name: string; email: string; phone: string; city: string; state: string; avatarUrl: string | null };

export default function MemberProfileForm({ profile }: { profile: Profile }) {
  const [state, setState] = useState(profile);
  const [avatar, setAvatar] = useState<File>();
  const [preview, setPreview] = useState(profile.avatarUrl);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const data = new FormData();
    Object.entries(state).forEach(([key, value]) => { if (key !== 'email' && key !== 'avatarUrl') data.set(key, value || ''); });
    if (avatar) data.set('avatar', avatar);
    startTransition(async () => {
      const result = await updateMemberProfileAction(data);
      setMessage({ ok: result.success, text: result.success ? 'Perfil atualizado com sucesso.' : result.error || 'Não foi possível atualizar.' });
      if (result.avatarUrl) { setPreview(result.avatarUrl); setAvatar(undefined); }
    });
  };
  const set = (key: keyof Profile, value: string) => setState((current) => ({ ...current, [key]: value }));
  return <form onSubmit={submit} className="space-y-6"><section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs"><div className="flex items-center gap-4"><button type="button" onClick={() => fileRef.current?.click()} className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-stone-100 text-stone-500">{preview ? <Image src={preview} alt="Sua foto" fill sizes="96px" unoptimized={preview.startsWith('blob:')} className="object-cover" /> : <UserRound className="h-10 w-10" />}<span className="absolute inset-x-0 bottom-0 flex justify-center bg-black/55 py-1 text-white"><Camera className="h-4 w-4" /></span></button><div><h2 className="font-serif font-bold text-[#4B161B]">Foto do perfil</h2><p className="text-xs text-stone-500">JPEG, PNG ou WebP; otimização automática.</p><button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-xs font-bold text-[#4B161B] underline">Escolher foto</button></div><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const optimized = await optimizeImageForUpload(file, { maxBytes: 2.8 * 1024 * 1024, maxDimension: 1200 }); setAvatar(optimized); setPreview(URL.createObjectURL(optimized)); setMessage(undefined); } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : 'Não foi possível otimizar a imagem.' }); } }} /></div></section><section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:grid-cols-2"><label className="text-xs font-bold text-stone-700 sm:col-span-2">Nome completo<input value={state.name} onChange={(e) => set('name', e.target.value)} required className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-stone-700 sm:col-span-2">E-mail<input value={state.email} disabled className="mt-1 block w-full rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-sm font-normal text-stone-500" /><span className="mt-1 block text-[10px] font-normal text-stone-500">Alterações de e-mail exigem confirmação e serão disponibilizadas na área de segurança.</span></label><label className="text-xs font-bold text-stone-700">Telefone<input value={state.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(75) 99999-9999" className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-stone-700">Cidade<input value={state.city} onChange={(e) => set('city', e.target.value)} required className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal" /></label><label className="text-xs font-bold text-stone-700">UF<input value={state.state} maxLength={2} onChange={(e) => set('state', e.target.value.toUpperCase())} required className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal uppercase" /></label></section>{message && <div className={`rounded-xl border p-3 text-sm ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</div>}<div className="flex justify-end"><button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-[#4B161B] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Salvar perfil</button></div></form>;
}
