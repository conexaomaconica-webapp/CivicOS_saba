export type BusinessStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "ARCHIVED";

export class BusinessStatusValue {
  private constructor(private readonly value: BusinessStatus) {}

  public static create(value: BusinessStatus): BusinessStatusValue {
    return new BusinessStatusValue(value);
  }

  public getValue(): BusinessStatus {
    return this.value;
  }

  public canTransitionTo(nextStatus: BusinessStatus): boolean {
    const transitions: Record<BusinessStatus, BusinessStatus[]> = {
      DRAFT: ["SUBMITTED", "ARCHIVED"],
      SUBMITTED: ["UNDER_REVIEW", "ARCHIVED"],
      UNDER_REVIEW: ["APPROVED", "DRAFT", "ARCHIVED"],
      APPROVED: ["PUBLISHED", "ARCHIVED"],
      PUBLISHED: ["ARCHIVED"],
      ARCHIVED: ["DRAFT"]
    };

    return transitions[this.value]?.includes(nextStatus) ?? false;
  }
}
