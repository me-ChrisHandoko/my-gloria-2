/**
 * Permission Delegation Service
 * Types and interfaces for permission delegation feature
 */

export interface DelegatedPermission {
  resource: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'EXPORT' | 'IMPORT' | 'PRINT' | 'ASSIGN' | 'CLOSE';
  scope?: 'OWN' | 'DEPARTMENT' | 'SCHOOL' | 'ALL';
}

export interface UserProfile {
  id: string;
  nip: string;
  dataKaryawan: {
    nama: string;
    email?: string;
    noPonsel?: string;
    bagianKerja?: string;
  };
}

export interface PermissionDelegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  permissions: DelegatedPermission[];
  reason: string;
  validFrom: Date;
  validUntil: Date;
  isRevoked: boolean;
  revokedBy?: string;
  revokedAt?: Date;
  revokedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  delegator?: UserProfile;
  delegate?: UserProfile;
}

export interface CreateDelegationDto {
  delegateId: string;
  permissions: DelegatedPermission[];
  reason: string;
  validUntil: Date;
}

export interface RevokeDelegationDto {
  reason: string;
}

export interface DelegationListResponse {
  data: PermissionDelegation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type DelegationStatus = 'active' | 'expired' | 'revoked';

export function getDelegationStatus(delegation: PermissionDelegation): DelegationStatus {
  if (delegation.isRevoked) {
    return 'revoked';
  }
  if (new Date(delegation.validUntil) < new Date()) {
    return 'expired';
  }
  return 'active';
}

export function formatPermissions(permissions: DelegatedPermission[]): string {
  return permissions
    .map(p => `${p.resource}.${p.action}${p.scope ? ` (${p.scope})` : ''}`)
    .join(', ');
}
