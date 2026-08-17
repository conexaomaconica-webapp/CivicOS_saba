import { notFound } from 'next/navigation';
import { PublicShell } from '@/components/public/PublicShell';
import { FigmaPrataView } from '@/components/visual-lab/FigmaPrataView';
import { bronzeViewerFixture } from '@/visual-lab/fixtures/bronze-business';

export const dynamic = 'force-dynamic';

export default function FigmaPrataVisualLabPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

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
        overflowX: 'hidden',
        maxWidth: '100vw',
      } as React.CSSProperties}
    >
      <PublicShell productName="Conexão Maçônica" showFooter={false} viewer={bronzeViewerFixture}>
        <FigmaPrataView />
      </PublicShell>
    </div>
  );
}
