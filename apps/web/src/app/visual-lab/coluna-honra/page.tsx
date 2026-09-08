import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { colunaHonraBusinessFixture } from '@/visual-lab/fixtures/coluna-honra-business';
import '@/styles/directory-home.css';

export const dynamic = 'force-dynamic';

export default function ColunaHonraVisualLabPage() {
  return (
    <FavoritesProvider>
      <DirectoryHeader />
      <BusinessProfileRenderer business={colunaHonraBusinessFixture} />
      <DirectoryFavoritesModal />
      <DirectoryFooter />
    </FavoritesProvider>
  );
}
