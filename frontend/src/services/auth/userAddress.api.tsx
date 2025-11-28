import api from "../customizeAPI";
import type { ApiResponse } from "@iService";

export interface UserAddress {
  _id: string;
  UserId: string;
  Address: string;
  City: string;
  District: string;
  IsDefault: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreateAddressRequest {
  Address: string;
  City: string;
  District: string;
  IsDefault?: boolean;
}

export interface UpdateAddressRequest {
  Address?: string;
  City?: string;
  District?: string;
  IsDefault?: boolean;
}

const parseResponse = async (response: Response): Promise<ApiResponse<unknown>> => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Parsing response:', { 
        status: response.status, 
        ok: response.ok,
        data 
      });
      
      // Backend returns { success: true/false, message: "...", data: ... }
      if (data.hasOwnProperty('success')) {
        return {
          code: response.status,
          message: data.message || 'Request completed',
          data: data.success ? data.data : undefined,
        };
      }
      
      // Fallback: if no success field, check response.ok
      return {
        code: response.status,
        message: data.message || 'Request completed',
        data: response.ok ? (data.data || data) : undefined,
      };
    } else {
      const text = await response.text();
      return {
        code: response.status,
        message: text || 'Unexpected response format',
        data: undefined,
      };
    }
  } catch (error) {
    console.error('Error parsing response:', error);
    return {
      code: response.status || 500,
      message: 'Failed to parse response',
      data: undefined,
    };
  }
};

// Get all user addresses
export const getUserAddresses = async (): Promise<ApiResponse<UserAddress[]>> => {
  const response = await api.get("/user/addresses");
  return await parseResponse(response) as ApiResponse<UserAddress[]>;
};

// Create new address
export const createUserAddress = async (
  payload: CreateAddressRequest
): Promise<ApiResponse<UserAddress>> => {
  const response = await api.post("/user/addresses", payload);
  return await parseResponse(response) as ApiResponse<UserAddress>;
};

// Update address
export const updateUserAddress = async (
  addressId: string,
  payload: UpdateAddressRequest
): Promise<ApiResponse<UserAddress>> => {
  const response = await api.put(`/user/addresses/${addressId}`, payload);
  return await parseResponse(response) as ApiResponse<UserAddress>;
};

// Delete address
export const deleteUserAddress = async (
  addressId: string
): Promise<ApiResponse<UserAddress>> => {
  const response = await api.delete(`/user/addresses/${addressId}`);
  return await parseResponse(response) as ApiResponse<UserAddress>;
};

