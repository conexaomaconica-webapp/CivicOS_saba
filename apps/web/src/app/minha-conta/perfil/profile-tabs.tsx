'use client';

import { useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import MemberProfileForm from './member-profile-form';
import PasswordForm from './password-form';

type Tab = 'dados' | 'senha';
type FormProfile = React.ComponentProps<typeof MemberProfileForm>['profile'];

const tabs: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: 'dados', label: 'Dados pessoais', icon: UserRound },
  { id: 'senha', label: 'Senha', icon: KeyRound },
];

export default function ProfileTabs({
  profile,
  canChangePassword,
  initialTab,
}: {
  profile: FormProfile;
  canChangePassword: boolean;
  initialTab: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Seções do perfil" className="grid grid-cols-2 gap-1 rounded-2xl border border-stone-200 bg-white p-1 sm:inline-grid">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              id={`tab-${id}`}
              aria-selected={active}
              aria-controls={`panel-${id}`}
              onClick={() => setTab(id)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold ${
                active ? 'bg-[var(--member-primary)] text-[var(--member-primary-fg)]' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'dados' ? <MemberProfileForm profile={profile} /> : <PasswordForm canChangePassword={canChangePassword} />}
      </div>
    </div>
  );
}
