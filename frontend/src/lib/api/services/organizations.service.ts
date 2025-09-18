import apiClient from '../client';
import { API_ENDPOINTS } from '../constants';
import type { PaginatedResponse, QueryParams } from '../types';

// Organization types
export interface Organization {
  id: string;
  name: string;
  code: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isActive: boolean;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface CreateOrganizationDto {
  name: string;
  code: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface UpdateOrganizationDto extends Partial<CreateOrganizationDto> {
  isActive?: boolean;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface InviteUserDto {
  email: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  message?: string;
}

// Organization service class
class OrganizationService {
  /**
   * Get paginated list of organizations
   */
  async getOrganizations(params?: QueryParams): Promise<PaginatedResponse<Organization>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<Organization>>(
      `${API_ENDPOINTS.ORGANIZATIONS.BASE}${queryString}`
    );
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: string): Promise<Organization> {
    return apiClient.get<Organization>(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id));
  }

  /**
   * Create a new organization
   */
  async createOrganization(data: CreateOrganizationDto): Promise<Organization> {
    return apiClient.post<Organization>(API_ENDPOINTS.ORGANIZATIONS.BASE, data);
  }

  /**
   * Update organization by ID
   */
  async updateOrganization(id: string, data: UpdateOrganizationDto): Promise<Organization> {
    return apiClient.patch<Organization>(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id), data);
  }

  /**
   * Delete organization by ID
   */
  async deleteOrganization(id: string): Promise<void> {
    return apiClient.delete<void>(API_ENDPOINTS.ORGANIZATIONS.BY_ID(id));
  }

  /**
   * Get organization members
   */
  async getOrganizationMembers(
    organizationId: string,
    params?: QueryParams
  ): Promise<PaginatedResponse<OrganizationMember>> {
    const queryString = apiClient.buildQueryString(params);
    return apiClient.get<PaginatedResponse<OrganizationMember>>(
      `${API_ENDPOINTS.ORGANIZATIONS.MEMBERS(organizationId)}${queryString}`
    );
  }

  /**
   * Add member to organization
   */
  async addMember(
    organizationId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  ): Promise<OrganizationMember> {
    return apiClient.post<OrganizationMember>(
      API_ENDPOINTS.ORGANIZATIONS.MEMBERS(organizationId),
      { userId, role }
    );
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    organizationId: string,
    memberId: string,
    role: 'ADMIN' | 'MEMBER' | 'VIEWER'
  ): Promise<OrganizationMember> {
    return apiClient.patch<OrganizationMember>(
      `${API_ENDPOINTS.ORGANIZATIONS.MEMBERS(organizationId)}/${memberId}`,
      { role }
    );
  }

  /**
   * Remove member from organization
   */
  async removeMember(organizationId: string, memberId: string): Promise<void> {
    return apiClient.delete<void>(
      `${API_ENDPOINTS.ORGANIZATIONS.MEMBERS(organizationId)}/${memberId}`
    );
  }

  /**
   * Invite user to organization
   */
  async inviteUser(organizationId: string, data: InviteUserDto): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(
      API_ENDPOINTS.ORGANIZATIONS.INVITES(organizationId),
      data
    );
  }

  /**
   * Get organization invites
   */
  async getInvites(organizationId: string): Promise<any[]> {
    return apiClient.get<any[]>(API_ENDPOINTS.ORGANIZATIONS.INVITES(organizationId));
  }

  /**
   * Cancel invite
   */
  async cancelInvite(organizationId: string, inviteId: string): Promise<void> {
    return apiClient.delete<void>(
      `${API_ENDPOINTS.ORGANIZATIONS.INVITES(organizationId)}/${inviteId}`
    );
  }

  /**
   * Accept invite
   */
  async acceptInvite(inviteToken: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/organizations/invites/accept', {
      token: inviteToken,
    });
  }

  /**
   * Upload organization logo
   */
  async uploadLogo(organizationId: string, file: File): Promise<{ url: string }> {
    return apiClient.uploadFile(
      `${API_ENDPOINTS.ORGANIZATIONS.BY_ID(organizationId)}/logo`,
      file
    );
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string): Promise<any> {
    return apiClient.get(`${API_ENDPOINTS.ORGANIZATIONS.BY_ID(organizationId)}/stats`);
  }
}

// Export singleton instance
export const organizationService = new OrganizationService();