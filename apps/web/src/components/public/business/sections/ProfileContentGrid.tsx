import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { InstitutionalBadges } from '../shared/InstitutionalBadges';
import { BusinessOwnerCard } from './BusinessOwnerCard';
import { BusinessHours } from './BusinessHours';
import { BusinessLocationCard } from './BusinessLocationCard';
import { BusinessContacts } from './BusinessContacts';
import { BusinessCommunityReviewsCard } from './BusinessCommunityReviewsCard';
import { BusinessProfileSections } from './BusinessProfileSections';
import { countMainSections, isSparseProfile } from './profile-density';

/**
 * Corpo do perfil público, padrão de todos os planos (Esquadro, Compasso e Acácia).
 *
 * A barra lateral SEMPRE começa com, nesta ordem: card do plano (selo do plano da empresa), responsável e contatos.
 * - Perfil com conteúdo: conteúdo principal (8 colunas) + lateral (4 colunas) com os três cards fixos,
 *   seguidos de horário, avaliações, mapa e mural de conexões (nesta ordem).
 * - Perfil com pouco conteúdo (0 ou 1 seção): a lateral fica só com os três cards fixos, e os demais
 *   (horário, avaliações, mapa e mural) ocupam a área principal em 2 colunas, em vez de deixar um vazio no meio.
 */
export function ProfileContentGrid({ profile }: { profile: PublicBusinessPresentation }) {
  const { identity, recognition, authority, owner } = profile;

  const planCard = (
    <InstitutionalBadges recognition={recognition} catalog={recognition.catalog} commercialPlan={profile.plan.commercialPlan} variant="gold-card" />
  );
  const ownerCard = (
    <BusinessOwnerCard owner={owner} logo={identity.logo} businessName={identity.name} isVerified={authority?.isVerified || recognition?.verified} />
  );
  const hoursCard = <BusinessHours hours={profile.hours} />;
  const locationCard = <BusinessLocationCard location={profile.location} businessName={identity.name} />;
  const contactsCard = (
    <div id="contato">
      <BusinessContacts contacts={profile.contacts} />
    </div>
  );
  // Avaliações e Mural de Conexões são cards separados: o mapa fica entre os dois.
  const reviewsCard = (
    <div id="comentarios">
      <BusinessCommunityReviewsCard reviews={profile.reviews} owner={owner} businessSlug={identity.slug} part="reviews" />
    </div>
  );
  const connectionsCard = <BusinessCommunityReviewsCard reviews={profile.reviews} owner={owner} businessSlug={identity.slug} part="connections" />;

  if (isSparseProfile(profile)) {
    const secondary = [hoursCard, reviewsCard, locationCard, connectionsCard];
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <main className="space-y-6 lg:col-span-8">
          {countMainSections(profile) > 0 && <BusinessProfileSections profile={profile} />}
          <div className="columns-1 gap-6 md:columns-2">
            {secondary.map((card, index) => (
              <div key={index} className="mb-6 break-inside-avoid empty:hidden">
                {card}
              </div>
            ))}
          </div>
        </main>
        <aside className="space-y-6 lg:col-span-4">
          {planCard}
          {ownerCard}
          {contactsCard}
        </aside>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <main className="space-y-6 lg:col-span-8">
        <BusinessProfileSections profile={profile} />
      </main>
      <aside className="space-y-6 lg:col-span-4">
        {planCard}
        {ownerCard}
        {contactsCard}
        {hoursCard}
        {reviewsCard}
        {locationCard}
        {connectionsCard}
      </aside>
    </div>
  );
}
