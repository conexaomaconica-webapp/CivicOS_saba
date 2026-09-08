import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { ouroBusinessFixture } from '@/visual-lab/fixtures/ouro-business';
import '@/styles/directory-home.css';

export const dynamic = 'force-dynamic';

export default function OuroVisualLabPage() {
  return (
    <FavoritesProvider>
      <DirectoryHeader />
      <BusinessProfileRenderer business={ouroBusinessFixture} />
      <DirectoryFavoritesModal />
      <DirectoryFooter />
    </FavoritesProvider>
  );
}
