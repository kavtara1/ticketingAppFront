export interface AuthTokens {
  refresh: string;
  access: string;
}

export interface CurrentUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  departmentName: string;
}

export interface TokenValidationRequest {
  token: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  userId: string;
  tokenType: 'access' | 'refresh';
  expiresAt: number;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
}
