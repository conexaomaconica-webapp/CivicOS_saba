import { BusinessBronzeTemplate } from '@/components/public/business/BusinessBronzeTemplate';
import { PublicShell } from '@/components/public/PublicShell';
import { fundadorBusinessFixture } from '@/visual-lab/fixtures/fundador-business';

export const dynamic = 'force-dynamic';

export default function FundadorVisualLabPage() {
  return (
    <div className="cm-theme-conexao">
      <PublicShell productName="Conexão Maçônica" showFooter={false} viewer={{ name: 'Eduardo Saba', location: 'São Paulo, SP' }}>
        <BusinessBronzeTemplate business={fundadorBusinessFixture} />
      </PublicShell>
    </div>
  );
}
