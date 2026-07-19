export interface CommandContext {
  tenantId: string;
  actorId: string;
  correlationId: string;
  timestamp: Date;
}

export interface CreateBusinessCommand {
  context: CommandContext;
  payload: {
    name: string;
    category: string;
    description: string;
    contact: string;
    location: string;
  };
}

export interface SubmitBusinessCommand {
  context: CommandContext;
  payload: {
    businessId: string;
  };
}

export interface ApproveBusinessCommand {
  context: CommandContext;
  payload: {
    businessId: string;
  };
}

export interface RejectBusinessCommand {
  context: CommandContext;
  payload: {
    businessId: string;
    reason: string;
  };
}

export interface PublishBusinessCommand {
  context: CommandContext;
  payload: {
    businessId: string;
  };
}

export interface ArchiveBusinessCommand {
  context: CommandContext;
  payload: {
    businessId: string;
  };
}
