import type { BusinessProps, BusinessStatus } from '@saas/plugin-business-directory';
import { Business } from '@saas/plugin-business-directory';

export interface BusinessRecord {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  contact: string;
  location: string;
  status: string;
  created_at: number;
  updated_at: number;
}

export class BusinessPersistenceMapper {
  static toPersistence(aggregate: Business): BusinessRecord {
    const props = aggregate.getProps();
    return {
      id: props.id,
      tenant_id: props.tenantId,
      name: props.name,
      slug: props.slug,
      category: props.category,
      description: props.description,
      contact: props.contact,
      location: props.location,
      status: aggregate.getStatus(),
      created_at: props.createdAt,
      updated_at: props.updatedAt,
    };
  }

  static toDomain(record: BusinessRecord): Business {
    const props: BusinessProps = {
      id: record.id,
      tenantId: record.tenant_id,
      name: record.name,
      slug: record.slug,
      category: record.category,
      description: record.description,
      contact: record.contact,
      location: record.location,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
    return Business.create(props, record.status as BusinessStatus);
  }
}
