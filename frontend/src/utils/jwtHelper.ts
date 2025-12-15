import { jwtDecode } from "jwt-decode";

export interface DecodedToken {
  email: string;
  userGuid?: string;
  avatarUrl?: string;
  fullName?: string;
  _id?: string;
  userId?: string; // Thêm userId để hỗ trợ cả 2 format
  role?: string;
  exp: number;
  iat: number;
}

/**
 * Decode JWT token safely
 * @param token - JWT token string
 * @returns Decoded token or null if invalid
 */
export const decodeToken = (token: string | null | undefined): DecodedToken | null => {
  if (!token || typeof token !== "string" || !token.trim()) {
    return null;
  }

  try {
    const decoded = jwtDecode<DecodedToken>(token);
    
    // Validate token has required fields
    if (!decoded.exp || !decoded.email) {
      return null;
    }

    // Check if token is expired
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};

/**
 * Get user initial from token
 * @param token - Decoded token or token string
 * @returns User initial letter
 */
export const getUserInitial = (token: DecodedToken | string | null | undefined): string => {
  if (!token) return "U";

  let decoded: DecodedToken | null = null;
  
  if (typeof token === "string") {
    decoded = decodeToken(token);
  } else {
    decoded = token;
  }

  if (!decoded) return "U";

  return (
    decoded.fullName?.charAt(0).toUpperCase() ||
    decoded.email?.charAt(0).toUpperCase() ||
    "U"
  );
};

