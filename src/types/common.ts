export interface PaginationParams {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  pagination?: PaginationParams;
  error?: {
    code: string;
    message: string;
  };
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface TimeRange {
  start: Date;
  end: Date;
}

