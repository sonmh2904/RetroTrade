import api from "../customizeAPI";
import type { ApiResponse } from "@iService";

// Cart Item Types
export interface CartItem {
  _id: string;
  itemId: string;
  title: string;
  shortDescription: string;
  basePrice: number;
  depositAmount: number;
  currency: string;
  availableQuantity: number;
  category: {
    _id: string;
    CategoryName: string;
  };
  owner: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    userGuid?: string;
  };
  condition: string;
  priceUnit: string;
  primaryImage?: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  minRentalDuration: number;
  maxRentalDuration: number;
}

export interface AddToCartRequest {
  itemId: string;
  quantity?: number;
  rentalStartDate?: string;
  rentalEndDate?: string;
}

export interface UpdateCartItemRequest {
  quantity?: number;
  rentalStartDate?: string;
  rentalEndDate?: string;
}

export interface CartItemCount {
  count: number;
}

// Helper function to parse response
const parseResponse = async (response: Response): Promise<ApiResponse<unknown>> => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      // Handle backend response format: { success: boolean, message: string, data: any }
      if (data.hasOwnProperty('success')) {
        return {
          code: response.status,
          message: data.message || 'Request completed',
          data: data.success ? data.data : undefined
        };
      }
      
      // Handle other response formats
      return {
        code: response.status,
        message: data.message || 'Request completed',
        data: data.data || data
      };
    } else {
      const text = await response.text();
      return {
        code: response.status,
        message: text || 'Unexpected response format',
        data: undefined
      };
    }
  } catch (error: unknown) {
    console.error('Error parsing response:', error);
    return {
      code: response.status || 500,
      message: 'Failed to parse response',
      data: undefined
    };
  }
};

// Cart Item API functions
export const getCartItems = async (): Promise<ApiResponse<CartItem[]>> => {
  const response = await api.get("/cart");
  return await parseResponse(response) as ApiResponse<CartItem[]>;
};

export const addToCart = async (payload: AddToCartRequest): Promise<ApiResponse<CartItem>> => {
  const response = await api.post("/cart", payload);
  return await parseResponse(response) as ApiResponse<CartItem>;
};

export const updateCartItem = async (cartItemId: string, payload: UpdateCartItemRequest): Promise<ApiResponse<CartItem>> => {
  const response = await api.put(`/cart/${cartItemId}`, payload);
  return await parseResponse(response) as ApiResponse<CartItem>;
};

export const removeFromCart = async (cartItemId: string): Promise<ApiResponse<CartItem>> => {
  const response = await api.delete(`/cart/${cartItemId}`);
  return await parseResponse(response) as ApiResponse<CartItem>;
};

export const clearCart = async (): Promise<ApiResponse<{ deletedCount: number }>> => {
  const response = await api.delete("/cart");
  return await parseResponse(response) as ApiResponse<{ deletedCount: number }>;
};

export const getCartItemCount = async (): Promise<ApiResponse<CartItemCount>> => {
  const response = await api.get("/cart/count");
  return await parseResponse(response) as ApiResponse<CartItemCount>;
};
