export interface IUser {
  id: string;
  clerkUserId: string;
  nip: string;
  isActive: boolean;
  lastActive?: Date | null;
  preferences?: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
}

export interface IUserWithRelations extends IUser {
  dataKaryawan?: any;
  roles?: any[];
  positions?: any[];
  permissions?: any[];
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface IPaginatedResult<T> {
  data: T[];
  pagination: IPaginationMeta;
}

export interface IUserFilters {
  search?: string;
  isActive?: boolean;
  nip?: string;
  clerkUserId?: string;
}

export interface IUserSortOptions {
  sortBy?: 'createdAt' | 'updatedAt' | 'nip' | 'lastActive';
  sortOrder?: 'asc' | 'desc';
}
