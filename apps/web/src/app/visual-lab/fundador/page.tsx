import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { fundadorBusinessFixture } from '@/visual-lab/fixtures/fundador-business';
import '@/styles/directory-home.css';

export const dynamic = 'force-dynamic';

export default function FundadorVisualLabPage() {
  return (
    <FavoritesProvider>
      <DirectoryHeader />
      <BusinessProfileRenderer business={fundadorBusinessFixture} />
      <DirectoryFavoritesModal />
      <DirectoryFooter />
    </FavoritesProvider>
  );
}
