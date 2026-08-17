import { BusinessBronzeTemplate } from '@/components/public/business/BusinessBronzeTemplate';
import { PublicShell } from '@/components/public/PublicShell';
import { prataBusinessFixture } from '@/visual-lab/fixtures/prata-business';

export const dynamic = 'force-dynamic';

export default function PrataVisualLabPage() {
  return (
    <div className="cm-theme-conexao">
      <PublicShell productName="Conexão Maçônica" showFooter={false} viewer={{ name: 'Eduardo Saba', location: 'São Paulo, SP' }}>
        <BusinessBronzeTemplate business={prataBusinessFixture} />
      </PublicShell>
    </div>
  );
}
