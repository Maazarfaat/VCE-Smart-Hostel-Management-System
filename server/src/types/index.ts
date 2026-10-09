import { Request } from 'express';

export type UserRole = 'ADMIN' | 'WARDEN' | 'STUDENT' | 'MAINTENANCE' | 'SECURITY';

export interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
  role: UserRole;
  name: string;
  studentId?: string | null;
  rollNumber?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    [key: string]: any;
  };
  errors?: any;
}
