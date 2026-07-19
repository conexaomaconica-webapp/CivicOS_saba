import type { BusinessRepository } from '@saas/plugin-business-directory';
import { Business } from '@saas/plugin-business-directory';
import type { DatabaseClient } from '../../database/database-client';
import { BusinessPersistenceMapper, type BusinessRecord } from '../business-mapper';

export class SupabaseBusinessRepositoryAdapter implements BusinessRepository {
  private readonly TABLE = 'business_directory_businesses';

  constructor(private readonly db: DatabaseClient) {}

  async save(business: Business): Promise<void> {
    const record = BusinessPersistenceMapper.toPersistence(business);
    
    const existing = await this.db.query<BusinessRecord>(
      `SELECT id FROM ${this.TABLE} WHERE id = $1`,
      [record.id]
    );

    if (existing.length > 0) {
      await this.db.update(this.TABLE, record.id, record);
    } else {
      await this.db.insert(this.TABLE, record);
    }
  }

  async update(business: Business): Promise<void> {
    return this.save(business);
  }

  async findById(id: string): Promise<Business | null> {
    const records = await this.db.query<BusinessRecord>(
      `SELECT * FROM ${this.TABLE} WHERE id = $1`,
      [id]
    );

    if (records.length === 0) {
      return null;
    }

    return BusinessPersistenceMapper.toDomain(records[0] as BusinessRecord);
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const records = await this.db.query<BusinessRecord>(
      `SELECT id FROM ${this.TABLE} WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    
    return records.length > 0;
  }
}
