import { Business } from '../entities/business';

export interface BusinessRepository {
  save(business: Business): Promise<void>;
  update(business: Business): Promise<void>;
  findById(id: string): Promise<Business | null>;
  existsBySlug(slug: string): Promise<boolean>;
}
