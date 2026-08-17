import { BusinessBronzeTemplate } from '@/components/public/business/BusinessBronzeTemplate';
import { PublicShell } from '@/components/public/PublicShell';
import { bronzeBusinessFixture, bronzeViewerFixture } from '@/visual-lab/fixtures/bronze-business';

export const dynamic = 'force-dynamic';

export default function BronzeVisualLabPage() {
  return (
    <div
      style={{
        '--color-primary-700': '#7a1f2e',
        '--color-primary-900': '#4a0e1a',
        '--color-accent-500': '#c9a227',
        '--color-background': '#F3EEDD',
        '--color-surface': '#ffffff',
        '--font-heading': "Georgia, 'Times New Roman', serif",
        '--font-interface': 'Arial, Helvetica, sans-serif',
      } as React.CSSProperties}
    >
      <PublicShell productName="Conexão Maçônica" showFooter={false} viewer={bronzeViewerFixture}>
        <BusinessBronzeTemplate business={bronzeBusinessFixture} />
      </PublicShell>
    </div>
  );
}
