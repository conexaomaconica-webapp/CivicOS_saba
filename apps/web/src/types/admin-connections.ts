export type AdminConnectionStatus = 'pendente' | 'confirmada' | 'recusada' | 'removida';
export type AdminConnectionType = 'compra' | 'servico' | 'parceria' | 'visita';

export type AdminConnectionListItem = {
  id: string;
  status: AdminConnectionStatus;
  connectionType: AdminConnectionType;
  itemDescription: string | null;
  message: string | null;
  hasPhoto: boolean;
  shareOnMural: boolean;
  createdAt: string;
  confirmedAt: string | null;
  business: { id: string; name: string; slug: string | null; active: boolean; published: boolean };
  member: { id: string; name: string | null; email: string | null };
};

export type AdminConnectionFilters = {
  page?: number;
  status?: AdminConnectionStatus | 'todas';
  type?: AdminConnectionType | 'todos';
  search?: string;
};

export type AdminConnectionList = {
  success: true;
  items: AdminConnectionListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
