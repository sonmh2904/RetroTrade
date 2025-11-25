import instance from "../customizeAPI";
import api from "../customizeAPI";

//owner
export const getUserAddresses = async (): Promise<Response> => {
  return await instance.get("/products/user/addresses");
};

export const getProductsByCategoryId = async (
  categoryId: string,
  params?: { page?: number; limit?: number }
): Promise<{
  success: boolean;
  message: string;
  data: { items: unknown[]; total: number; page: number; limit: number };
}> => {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    const res = await instance.get(
      `/products/product/category/${categoryId}${qs ? `?${qs}` : ""}`
    );
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return {
      success: true,
      message: "Không có sản phẩm",
      data: {
        items: [],
        total: 0,
        page: params?.page || 1,
        limit: params?.limit || 20,
      },
    };
  }
};

export const setDefaultAddress = (addressData: {
  Address: string;
  City: string;
  District: string;
}) => {
  return instance.post("/products/addresses/default", addressData);
};

export const addProduct = async (
  productData: FormData | Record<string, unknown>
): Promise<Response> => {
  return await instance.post("/products/user/add", productData);
};

export const uploadImages = async (formData: FormData): Promise<Response> => {
  return await instance.post("/products/upload", formData);
};

export const getConditions = async (): Promise<Response> => {
  return await instance.get("/conditions");
};

export const getPriceUnits = async (): Promise<Response> => {
  return await instance.get("/price-units");
};

export const getUserProducts = async (): Promise<Response> => {
  return await instance.get("/products/user");
};

export const getProductById = async (id: string): Promise<Response> => {
  return await instance.get(`/products/user/${id}`);
};

export const updateProduct = async (
  id: string,
  productData: FormData | Record<string, unknown>
): Promise<Response> => {
  return await instance.put(`/products/user/${id}`, productData);
};

export const deleteProduct = async (id: string): Promise<Response> => {
  return await instance.delete(`/products/user/${id}`);
};

//moderator
export const getPendingProducts = async (): Promise<Response> => {
  return await instance.get("/products/pending");
};

export const getPendingProductDetails = async (
  id: string
): Promise<Response> => {
  return await instance.get(`/products/pending/${id}`);
};

export const approveProduct = async (id: string): Promise<Response> => {
  return await instance.put(`/products/pending/${id}/approve`);
};

export const rejectProduct = async (
  id: string,
  reason?: string
): Promise<Response> => {
  return await instance.put(`/products/pending/${id}/reject`, { reason });
};

// Types for top highlight products
export interface TopHighlightProduct {
  _id: string;
  Title: string;
  ownerName: string;
  categoryName: string;
  BasePrice: number;
  Currency: string;
  ViewCount: number;
  FavoriteCount: number;
  RentCount: number;
  score: number;
  IsHighlighted: boolean;
  CreatedAt: string;
  thumbnailUrl?: string;
}

export interface HighlightResponse {
  success: boolean;
  message?: string;
  data: TopHighlightProduct[];
}

export const getHighlightedProducts = async (): Promise<Response> => {
  return await instance.get("/products/products/public/highlighted");
};

export const getTopProductsForHighlight = async (): Promise<Response> => {
  return await instance.get("/products/top-for-highlight");
};

export const toggleProductHighlight = async (
  id: string,
  isHighlighted?: boolean
): Promise<Response> => {
  const body = isHighlighted !== undefined ? { isHighlighted } : {};
  return await instance.put(`/products/approve/${id}/highlight`, body);
};

//product public

export const addToFavorites = async (productId: string): Promise<Response> => {
  return await instance.post(`/products/${productId}/favorite`);
};

export const removeFromFavorites = async (
  productId: string
): Promise<Response> => {
  return await instance.delete(`/products/${productId}/favorite`);
};

export const getFavorites = async (): Promise<Response> => {
  return await instance.get("/products/favorites");
};

export const getTopViewedItemsByOwner = async (
  ownerId: string,
  limit: number = 4
): Promise<{
  success: boolean;
  message: string;
  data: { items: unknown[]; total: number };
}> => {
  try {
    const res = await instance.get(
      `/products/owner/${ownerId}/top-viewed?limit=${limit}`
    );
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching top viewed items by owner:", error);
    return {
      success: true,
      message: "Không có sản phẩm",
      data: { items: [], total: 0 },
    };
  }
};

export const getAllItems = async (): Promise<{
  success: boolean;
  message: string;
  data: { items: unknown[]; total: number };
}> => {
  try {
    const res = await instance.get(`/products/public/items`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching all items:", error);
    throw error;
  }
};

export const getFeaturedItems = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  message: string;
  data: { items: unknown[]; total: number; page: number; limit: number };
}> => {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    const res = await instance.get(
      `/products/product/featured${qs ? `?${qs}` : ""}`
    );
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching featured items:", error);
    throw error;
  }
};

export const getSearchTags = async (): Promise<{
  success: boolean;
  message: string;
  data: { tags: { _id: string; name: string; count: number }[]; total: number };
}> => {
  try {
    const res = await instance.get(`/products/product/tags`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching search tags:", error);
    return {
      success: true,
      message: "Không có tag",
      data: { tags: [], total: 0 },
    };
  }
};

export const getPublicItemById = async (
  id: string
): Promise<{
  success: boolean;
  message: string;
  data: Record<string, unknown>;
}> => {
  try {
    const res = await instance.get(`/products/product/${id}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching item detail:", error);
    throw error;
  }
};

export const getAllPublicCategories = async (): Promise<{
  success: boolean;
  message: string;
  data: unknown[];
}> => {
  try {
    const res = await instance.get(`/products/public/categories`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching all public categories:", error);
    return { success: true, message: "Không có danh mục", data: [] };
  }
};

export const getAllCategories = async (): Promise<{ data: unknown[] }> => {
  try {
    const res = await instance.get(`/categories`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching all categories:", error);
    return { data: [] };
  }
};

export const getPublicStoreByUserGuid = async (
  userGuid: string,
  params?: { page?: number; limit?: number }
): Promise<{
  success: boolean;
  message: string;
  data: {
    owner: Record<string, unknown> | null;
    items: unknown[];
    total: number;
    page: number;
    limit: number;
  };
}> => {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    const res = await instance.get(
      `/products/store/${userGuid}${qs ? `?${qs}` : ""}`
    );
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error fetching public store by userGuid:", error);
    return {
      success: true,
      message: "Không tìm thấy cửa hàng",
      data: {
        owner: null,
        items: [],
        total: 0,
        page: params?.page || 1,
        limit: params?.limit || 20,
      },
    };
  }
};

// product.api.ts

export const getComparableProducts = async (
  productId: string,
  categoryId: string,
  limit: number = 5
): Promise<{ success: boolean; message: string; data: unknown[] }> => {
  try {
    const query = new URLSearchParams();
    if (limit) query.set("limit", limit.toString());

    const url = `/products/compare/${productId}/${categoryId}${
      query.toString() ? `?${query.toString()}` : ""
    }`;
    console.log("Fetching comparable products from:", url);

    const res = await instance.get(url);

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Không thể lấy sản phẩm so sánh");
    }

    const data = await res.json();
    console.log("Comparable products response:", data);
    return data;
  } catch (error) {
    console.error("Error fetching comparable products:", error);
    throw error instanceof Error
      ? error
      : new Error("Có lỗi xảy ra khi tải sản phẩm so sánh");
  }
};

export const getRatingsByItem = async (
  itemId: string
): Promise<{ data: unknown[] }> => {
  try {
    const res = await fetch(`/api/v1/products/rating/item/${itemId}`);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    return { data: Array.isArray(data) ? data : [] };
  } catch (error) {
    console.error(" Error fetching ratings:", error);
    return { data: [] };
  }
};

export const createRating = async (formData: FormData): Promise<unknown> => {
  try {
    const res = await instance.post("/products/rating", formData, {
      headers: {},
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error creating rating:", error);
    throw error;
  }
};

export interface OwnerRating {
  _id: string;
  rating: number;
  comment?: string;
  images?: string[];
  createdAt?: string;
  renterId?: Record<string, unknown>;
  itemId?: Record<string, unknown>;
  Item?: Record<string, unknown>;
}

export interface OwnerRatingsResult {
  average: number;
  success: boolean;
  message?: string;
  ratings: OwnerRating[];
  total: number;
  page: number;
  limit: number;
}

export const getRatingsByOwner = async (
  ownerId: string,
  params?: { page?: number; limit?: number }
): Promise<OwnerRatingsResult> => {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    const res = await instance.get(
      `/products/rating/owner/${ownerId}${qs ? `?${qs}` : ""}`
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const payload = data?.data || {};

    return {
      success: data?.success ?? true,
      message: data?.message,
      ratings: Array.isArray(payload.ratings) ? payload.ratings : [],
      total: Number(payload.total) || 0,
      page: Number(payload.page) || params?.page || 1,
      limit: Number(payload.limit) || params?.limit || 20,
      average: Number(payload.average) || 0,
    };
  } catch (error) {
    console.error("Error fetching owner ratings:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể tải đánh giá",
      ratings: [],
      total: 0,
      page: params?.page || 1,
      limit: params?.limit || 20,
      average: 0,
    };
  }
};

export const updateRating = async (
  id: string,
  payload: Record<string, unknown>
): Promise<unknown> => {
  try {
    const res = await api.put(`/products/rating/${id}`, payload);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error updating rating:", error);
    throw error;
  }
};

export const deleteRating = async (
  id: string,
  renterId: string
): Promise<unknown> => {
  try {
    const res = await api.delete(`/products/rating/${id}`, {
      body: JSON.stringify({ renterId }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error deleting rating:", error);
    throw error;
  }
};
