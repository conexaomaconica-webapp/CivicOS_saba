import Image from 'next/image';
import Link from 'next/link';
import { Bell, ChevronDown, Heart, MapPin } from 'lucide-react';
import type { PublicMediaAsset } from '@/lib/business/public-business-presentation';
import { BusinessMedia } from './business/BusinessMedia';

type PublicHeaderProps = {
  productName: string;
  logoUrl?: string | null;
  viewer?: { name: string; location?: string | null; avatar?: PublicMediaAsset | null } | null;
};

export function PublicHeader({ productName, logoUrl, viewer }: PublicHeaderProps) {
  return (
    <header className="cm-public-header">
      <div className="cm-public-header__inner">
        <Link href="/" className="cm-public-brand" aria-label={`${productName} — início`}>
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={52}
              height={52}
              unoptimized
              className="cm-public-brand__logo"
            />
          ) : (
            <span className="cm-public-brand__mark" aria-hidden="true">
              <span>◇</span>
              <span>△</span>
            </span>
          )}
          <span className="cm-public-brand__name">{productName}</span>
        </Link>

        <nav className="cm-public-nav" aria-label="Navegação principal">
          <Link href="/">Início</Link>
          <Link href="/guia" aria-current="page">Empresas</Link>
          <Link href="/beneficios">Benefícios</Link>
          <Link href="/eventos">Eventos</Link>
          <Link href="/lojas-maconicas">Lojas Maçônicas</Link>
        </nav>

        <div className="cm-public-actions">
          <button type="button" aria-label="Favoritos"><Heart /></button>
          <button type="button" className="cm-public-notification" aria-label="Notificações">
            <Bell />
            <span>3</span>
          </button>
          <span className="cm-public-actions__divider" aria-hidden="true" />
          {viewer ? (
            <button type="button" className="cm-public-profile" aria-label="Abrir menu do perfil">
              <span className="cm-public-profile__avatar">
                {viewer.avatar ? <BusinessMedia asset={viewer.avatar} sizes="44px" /> : viewer.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')}
              </span>
              <span className="cm-public-profile__copy">
                <strong>{viewer.name}</strong>
                {viewer.location ? <small><MapPin /> {viewer.location}</small> : null}
              </span>
              <ChevronDown />
            </button>
          ) : <Link href="/auth/login" className="cm-public-login">Entrar</Link>}
        </div>
      </div>
    </header>
  );
}
