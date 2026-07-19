import { BusinessStatus, BusinessStatusValue } from '../enums/business-status';

export interface BusinessProps {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  contact: string;
  location: string;
  createdAt: number;
  updatedAt: number;
}

export class Business {
  private status: BusinessStatusValue;

  private constructor(private props: BusinessProps, initialStatus: BusinessStatus) {
    this.status = BusinessStatusValue.create(initialStatus);
    this.validate();
  }

  public static create(
    props: Omit<BusinessProps, 'slug'> & { slug: string },
    status: BusinessStatus = 'DRAFT'
  ): Business {
    return new Business(props, status);
  }

  public getId(): string {
    return this.props.id;
  }

  public getTenantId(): string {
    return this.props.tenantId;
  }

  public getName(): string {
    return this.props.name;
  }

  public getSlug(): string {
    return this.props.slug;
  }

  public getStatus(): BusinessStatus {
    return this.status.getValue();
  }
  
  public getProps(): Readonly<BusinessProps> {
    return { ...this.props };
  }

  public transitionTo(newStatus: BusinessStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new Error(`Transição de estado inválida: de ${this.status.getValue()} para ${newStatus}`);
    }
    this.status = BusinessStatusValue.create(newStatus);
    this.props.updatedAt = Date.now();
  }

  private validate(): void {
    if (!this.props.id || this.props.id.trim() === '') {
      throw new Error("O ID da empresa é obrigatório");
    }
    if (!this.props.tenantId || this.props.tenantId.trim() === '') {
      throw new Error("O Tenant ID é obrigatório");
    }
    if (!this.props.name || this.props.name.trim() === '') {
      throw new Error("O nome da empresa é obrigatório");
    }
  }
}
