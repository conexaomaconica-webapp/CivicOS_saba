import { DirectoryHeader } from '@/components/public/directory/DirectoryHeader';
import { DirectoryFooter } from '@/components/public/directory/DirectoryFooter';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { DirectoryFavoritesModal } from '@/components/public/directory/DirectoryFavoritesModal';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { bronzeBusinessFixture } from '@/visual-lab/fixtures/bronze-business';
import '@/styles/directory-home.css';

export const dynamic = 'force-dynamic';

export default function BronzeVisualLabPage() {
  return (
    <FavoritesProvider>
      <DirectoryHeader />
      <BusinessProfileRenderer business={bronzeBusinessFixture} />
      <DirectoryFavoritesModal />
      <DirectoryFooter />
    </FavoritesProvider>
  );
}
