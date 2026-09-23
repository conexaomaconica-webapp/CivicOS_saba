import type { PublicBusinessPresentation, PublicProfileSectionKey } from '@/lib/business/public-business-presentation';
import { BusinessAbout } from './BusinessAbout';
import { BusinessBenefits } from './BusinessBenefits';
import { BusinessEvents } from './BusinessEvents';
import { BusinessGallery } from './BusinessGallery';
import { BusinessPosts } from './BusinessPosts';
import { BusinessServices } from './BusinessServices';
import { BusinessVideo } from './BusinessVideo';

const DEFAULT_ORDER: PublicProfileSectionKey[] = [
  'about', 'services', 'video', 'gallery', 'benefits', 'events', 'posts',
];

export function BusinessProfileSections({ profile }: { profile: PublicBusinessPresentation }) {
  const sections: Record<PublicProfileSectionKey, React.ReactNode> = {
    about: <div id="visao-geral"><BusinessAbout identity={profile.identity} /></div>,
    services: <div id="servicos"><BusinessServices services={profile.services} /></div>,
    video: <div id="video-institucional"><BusinessVideo video={profile.media.video} /></div>,
    gallery: <div id="fotos-videos"><BusinessGallery gallery={profile.media.gallery} /></div>,
    benefits: <div id="beneficios"><BusinessBenefits benefits={profile.benefits} businessName={profile.identity.name} /></div>,
    events: <BusinessEvents events={profile.events} />,
    posts: <BusinessPosts posts={profile.posts} />,
  };

  const order = profile.plan.sectionOrder?.length === DEFAULT_ORDER.length
    ? profile.plan.sectionOrder
    : DEFAULT_ORDER;

  return <>{order.map((key) => <div key={key}>{sections[key]}</div>)}</>;
}
