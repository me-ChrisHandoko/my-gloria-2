export interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profileId: string;
    nip: string;
    schoolId: string;
    roles: string[];
    permissions: string[];
    positions: Array<{
      id: string;
      positionName: string;
      departmentName: string;
    }>;
  };
  sessionId: string;
  expiresAt: string;
}

export interface AuthError {
  statusCode: number;
  message: string;
  error: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileId: string;
  nip: string;
  schoolId: string;
  roles: string[];
  permissions: string[];
  positions: Array<{
    id: string;
    positionName: string;
    departmentName: string;
  }>;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  error: string | null;
}

export type AuthMethod = 'email' | 'google' | 'microsoft';

export interface SignInFormData {
  email: string;
  code?: string;
}

export interface ValidationResult {
  success: boolean;
  message?: string;
  redirectUrl?: string;
}