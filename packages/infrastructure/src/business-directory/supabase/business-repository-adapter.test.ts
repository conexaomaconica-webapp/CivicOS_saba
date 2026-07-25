import { describe, it, expect, beforeEach } from 'vitest';

import { SupabaseBusinessRepositoryAdapter } from './business-repository-adapter';
import { Business } from '@saas/plugin-business-directory';
import type { DatabaseClient } from '../../database/database-client';
import type { BusinessRecord } from '../business-mapper';

class MockDatabaseClient implements DatabaseClient {
  public records: Record<string, BusinessRecord> = {};

  query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    if (sql.includes('slug = $1')) {
      const slug = params?.[0];
      const match = Object.values(this.records).find(r => r.slug === slug);
      return Promise.resolve((match ? [match] : []) as unknown as T[]);
    }
    
    if (sql.includes('id = $1')) {
      const param = params?.[0];
      const id = typeof param === 'string' ? param : '';
      const match = this.records[id];
      return Promise.resolve((match ? [match] : []) as unknown as T[]);
    }
    
    return Promise.resolve([]);
  }

  insert<T>(table: string, data: Partial<T>): Promise<T> {
    const record = data as unknown as BusinessRecord;
    this.records[record.id] = record;
    return Promise.resolve(record as unknown as T);
  }

  update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    const record = data as unknown as BusinessRecord;
    this.records[id] = record;
    return Promise.resolve(record as unknown as T);
  }

  delete(table: string, id: string): Promise<boolean> {
    delete this.records[id];
    return Promise.resolve(true);
  }

  transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

describe('SupabaseBusinessRepositoryAdapter', () => {
  let db: MockDatabaseClient;
  let adapter: SupabaseBusinessRepositoryAdapter;

  beforeEach(() => {
    db = new MockDatabaseClient();
    adapter = new SupabaseBusinessRepositoryAdapter(db);
  });

  const createBusiness = (id: string, slug: string) => {
    return Business.create({
      id,
      tenantId: 'tenant-1',
      name: 'Test Business',
      slug,
      category: 'RETAIL',
      description: 'Desc',
      contact: 'contact@test.com',
      location: 'BR',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }, 'DRAFT');
  };

  it('should save a new business (insert)', async () => {
    const b = createBusiness('b-1', 'test-business');
    await adapter.save(b);
    
    expect(db.records['b-1']).toBeDefined();
    expect(db.records['b-1'].slug).toBe('test-business');
  });

  it('should update an existing business', async () => {
    const b = createBusiness('b-1', 'test-business');
    await adapter.save(b);
    
    b.transitionTo('SUBMITTED');
    await adapter.save(b);

    expect(db.records['b-1'].status).toBe('SUBMITTED');
  });

  it('should find business by id', async () => {
    const b = createBusiness('b-2', 'test-2');
    await adapter.save(b);

    const found = await adapter.findById('b-2');
    expect(found).not.toBeNull();
    expect(found?.getId()).toBe('b-2');
    expect(found?.getStatus()).toBe('DRAFT');
  });

  it('should return null if business not found', async () => {
    const found = await adapter.findById('non-existent');
    expect(found).toBeNull();
  });

  it('should check if business exists by slug', async () => {
    const b = createBusiness('b-3', 'unique-slug');
    await adapter.save(b);

    const exists = await adapter.existsBySlug('unique-slug');
    const notExists = await adapter.existsBySlug('other-slug');

    expect(exists).toBe(true);
    expect(notExists).toBe(false);
  });
});
