import { BusinessBronzeTemplate } from '@/components/public/business/BusinessBronzeTemplate';
import { PublicShell } from '@/components/public/PublicShell';
import { ouroBusinessFixture } from '@/visual-lab/fixtures/ouro-business';

export const dynamic = 'force-dynamic';

export default function OuroVisualLabPage() {
  return (
    <div className="cm-theme-conexao">
      <PublicShell productName="Conexão Maçônica" showFooter={false} viewer={{ name: 'Eduardo Saba', location: 'São Paulo, SP' }}>
        <BusinessBronzeTemplate business={ouroBusinessFixture} />
      </PublicShell>
    </div>
  );
}
