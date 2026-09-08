import React from 'react';
import { Phone, Mail, Globe, MessageCircle } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.56 49.56 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9 10 15" />
    </svg>
  );
}

type BusinessContactsProps = {
  contacts: PublicBusinessPresentation['contacts'];
  className?: string;
};

export function BusinessContacts({
  contacts,
  className = '',
}: BusinessContactsProps) {
  const items: Array<{
    label: string;
    value: string;
    href: string;
    icon: any;
    color: string;
  }> = [];

  if (contacts.phone) {
    items.push({
      label: 'Telefone',
      value: contacts.phone,
      href: `tel:${contacts.phone.replace(/\D/g, '')}`,
      icon: Phone,
      color: 'text-[#4B161B]',
    });
  }

  if (contacts.whatsapp) {
    items.push({
      label: 'WhatsApp',
      value: contacts.whatsapp,
      href: `https://wa.me/${contacts.whatsapp.replace(/\D/g, '')}`,
      icon: MessageCircle,
      color: 'text-emerald-600',
    });
  }

  if (contacts.email) {
    items.push({
      label: 'E-mail',
      value: contacts.email,
      href: `mailto:${contacts.email}`,
      icon: Mail,
      color: 'text-[#C9A227]',
    });
  }

  // Helper para normalização e higienização estrita de URLs
  const toSafeUrl = (raw: string, domain: string): { url: string; display: string } | null => {
    let input = raw.trim();
    if (!input) return null;

    // Bloqueia esquemas perigosos (javascript:, data:, file:)
    if (/^(javascript|data|file):/i.test(input)) return null;

    // Se já é uma URL HTTP/HTTPS
    if (/^https?:\/\//i.test(input)) {
      try {
        const parsed = new URL(input);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return {
          url: parsed.toString(),
          display: parsed.pathname.replace(/^\//, '') || parsed.hostname,
        };
      } catch {
        return null;
      }
    }

    // Se for handle (@usuario ou caminho relativo)
    const cleanHandle = input.replace(/^@/, '').replace(/^\/+/, '');
    if (!cleanHandle) return null;

    return {
      url: `https://${domain}/${cleanHandle}`,
      display: `@${cleanHandle}`,
    };
  };

  if (contacts.instagram) {
    const parsed = toSafeUrl(contacts.instagram, 'instagram.com');
    if (parsed) {
      items.push({
        label: 'Instagram',
        value: parsed.display.startsWith('@') ? parsed.display : `@${parsed.display}`,
        href: parsed.url,
        icon: InstagramIcon,
        color: 'text-pink-600',
      });
    }
  }

  if (contacts.facebook) {
    const parsed = toSafeUrl(contacts.facebook, 'facebook.com');
    if (parsed) {
      items.push({
        label: 'Facebook',
        value: 'Página no Facebook',
        href: parsed.url,
        icon: FacebookIcon,
        color: 'text-blue-600',
      });
    }
  }

  if (contacts.linkedin) {
    const parsed = toSafeUrl(contacts.linkedin, 'linkedin.com');
    if (parsed) {
      items.push({
        label: 'LinkedIn',
        value: 'Perfil no LinkedIn',
        href: parsed.url,
        icon: LinkedinIcon,
        color: 'text-sky-700',
      });
    }
  }

  if (contacts.youtube) {
    const parsed = toSafeUrl(contacts.youtube, 'youtube.com');
    if (parsed) {
      items.push({
        label: 'YouTube',
        value: 'Canal no YouTube',
        href: parsed.url,
        icon: YoutubeIcon,
        color: 'text-rose-600',
      });
    }
  }

  if (contacts.website) {
    const parsed = toSafeUrl(contacts.website, '');
    if (parsed) {
      items.push({
        label: 'Website',
        value: contacts.website.replace(/^https?:\/\//, ''),
        href: parsed.url,
        icon: Globe,
        color: 'text-[#4B161B]',
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <section className={`p-4 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-3 ${className}`}>
      <h3 className="font-serif font-bold text-sm text-[#4B161B] border-b border-stone-100 pb-2">
        Contato
      </h3>

      <div className="space-y-2">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <a
              key={index}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-[#FDFBF7] border border-[#E8E5DF] hover:border-[#C9A227]/60 transition-all flex items-center gap-3 shadow-xs group"
            >
              <div className="p-2 rounded-lg bg-white border border-stone-200 shrink-0 shadow-2xs">
                <Icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-stone-500 font-medium">{item.label}</p>
                <p className="text-xs font-bold text-stone-900 group-hover:text-[#4B161B] transition-colors truncate">
                  {item.value}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
