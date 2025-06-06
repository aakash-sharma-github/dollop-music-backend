import { Request } from 'express';
import { IUser } from '../models/User';

// Extend Express Request type to include user
export interface AuthRequest extends Request {
  user?: IUser;
}

// API Response type
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// Paginated response
export interface PaginatedResponse<T> extends ApiResponse {
  pagination: PaginationParams;
  data: T[];
}

// Music track filter options
export interface MusicTrackFilters {
  search?: string;
  artist?: string;
  genre?: string;
  isPublic?: boolean;
  owner?: string;
  tags?: string[];
  sortBy?: 'createdAt' | 'playCount' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// JWT Payload type
export interface JwtPayload {
  id: string;
  iat: number;
  exp: number;
}

