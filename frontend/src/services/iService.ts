export interface ApiResponse<T> {
  code: number; 
  message?: string;
  data?: T;
  user?: unknown;
}

// Common pagination metadata when list endpoints are used
export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<TItem> {
  items: TItem[];
  meta: PaginationMeta;
}

// Auth-related types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type LoginResponseData = AuthTokens;

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  displayName?: string;
  bio?: string;
}

export interface UpdateAvatarRequest {
  avatarUrl: string;
}

// User profile entity inferred from profile page
export interface UserProfile {
  _id: string;
  userGuid: string;
  email: string;
  fullName: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  isEmailConfirmed: boolean;
  isPhoneConfirmed: boolean;
  isIdVerified: boolean;
  reputationScore: number;
  points: number;
  role: string;
  isDeleted?: boolean;
  isActive?: boolean;
  wallet?: {
    currency: string;
    balance: number;
  };
  idCardInfo?: {
    idNumber: string;
    fullName: string;
    dateOfBirth: string | Date;
    address: string;
    extractedAt?: string | Date;
    extractionMethod?: 'ocr' | 'manual';
  };
  lastLoginAt?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Convenience response aliases
export type LoginApiResponse = ApiResponse<LoginResponseData>;
export type ProfileApiResponse = ApiResponse<UserProfile> & { user?: UserProfile };
export type RegisterApiResponse = ApiResponse<null>;

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}


// Error shape when backend returns an error payload
export interface ErrorResponse {
  code: number;
  message: string;
  errors?: Record<string, string[]> | string[];
}

// Utility to help narrow Response.json() generics
export type JsonOf<T> = Promise<T>;


