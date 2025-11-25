import instance from "../customizeAPI";

export interface Category {
  _id: string;
  Name: string;
  Slug?: string;
  Description?: string;
  ParentCategoryId?: string | null;
  children?: Category[];
}

export interface Condition {
  ConditionId: number;
  ConditionName: string;
}

export interface PriceUnit {
  UnitId: number;
  UnitName: string;
}

export interface Tag {
  _id: string;
  name: string;
}

export interface Owner {
  _id: string;
  userGuid?: string;
  FullName?: string;
  DisplayName?: string;
  AvatarUrl?: string;
}

export interface ItemImage {
  ImageId: string;
  Url: string;
  IsPrimary: boolean;
  Ordinal: number;
}

export interface ProductTag {
  ItemTagId: string;
  TagId: string;
  Tag: Tag;
}

export interface Product {
  _id: string;
  ItemGuid?: string;
  Title: string;
  ShortDescription?: string;
  Description?: string;
  BasePrice: number;
  DepositAmount: number;
  Currency: string;
  Quantity: number;
  AvailableQuantity: number;
  MinRentalDuration?: number;
  MaxRentalDuration?: number;
  ViewCount: number;
  FavoriteCount: number;
  RentCount: number;
  IsHighlighted: boolean;
  IsTrending: boolean;
  Address?: string;
  City?: string;
  District?: string;
  CreatedAt: string;
  UpdatedAt: string;

  Category?: Category | null;
  Condition?: Condition | null;
  PriceUnit?: PriceUnit | null;
  Owner?: Owner | null;
  Images?: ItemImage[];
  Tags?: ProductTag[];
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface Renter {
  _id: string;
  FullName?: string;
  DisplayName?: string;
  AvatarUrl?: string;
}

export interface RatedItem {
  _id: string;
  Title: string;
  Images?: ItemImage[];
}

export interface Rating {
  _id: string;
  rating: number;
  comment?: string;
  images?: string[];
  createdAt: string;
  renterId: Renter;
  itemId: RatedItem;
  Item?: RatedItem;
}

export interface OwnerRatingsResult {
  success: boolean;
  message?: string;
  average: number;
  ratings: Rating[];
  total: number;
  page: number;
  limit: number;
}

export interface HighlightProduct {
  _id: string;
  Title: string;
  BasePrice: number;
  Currency: string;
  ViewCount: number;
  FavoriteCount: number;
  RentCount: number;
  thumbnail?: string;
  category?: Category;
  condition?: Condition;
  priceUnit?: PriceUnit;
  tags?: Tag[];
  Address?: string;
  City?: string;
  District?: string;
  CreatedAt: string;
}

export const getAllItems = async (): Promise<{ success: boolean; data: PaginatedProducts; message: string }> => {
  const res = await instance.get("/products/public/items");
  return res.json();
};

export const getFeaturedItems = async (params?: { page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await instance.get(`/products/product/featured?${query.toString()}`);
  return res.json() as Promise<{ success: boolean; data: PaginatedProducts; message: string }>;
};

export const getProductsByCategoryId = async (
  categoryId: string,
  params?: { page?: number; limit?: number }
): Promise<{ success: boolean; data: PaginatedProducts; message: string }> => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await instance.get(`/products/product/category/${categoryId}?${query.toString()}`);
  return res.json();
};

export const getPublicItemById = async (id: string): Promise<{
  success: boolean;
  message: string;
  data: Product;
}> => {
  const res = await instance.get(`/products/product/${id}`);
  return res.json();
};

export const getPublicStoreByUserGuid = async (
  userGuid: string,
  params?: { page?: number; limit?: number }
): Promise<{
  success: boolean;
  message: string;
  data: {
    owner: Owner;
    items: Product[];
    total: number;
    page: number;
    limit: number;
  };
}> => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await instance.get(`/products/store/${userGuid}?${query.toString()}`);
  return res.json();
};

export const getAllPublicCategories = async (): Promise<{
  success: boolean;
  message: string;
  data: Category[];
}> => {
  const res = await instance.get("/products/public/categories");
  return res.json();
};

export const getHighlightedProducts = async (): Promise<{
  success: boolean;
  message: string;
  data: HighlightProduct[];
}> => {
  const res = await instance.get("/products/products/public/highlighted");
  return res.json();
};

export const getComparableProducts = async (
  productId: string,
  categoryId: string,
  limit = 5
): Promise<{
  success: boolean;
  message: string;
  data: Product[];
}> => {
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));

  const res = await instance.get(
    `/products/compare/${productId}/${categoryId}?${query.toString()}`
  );
  return res.json();
};

export const getTopViewedItemsByOwner = async (
  ownerId: string,
  limit = 4
): Promise<{ success: boolean; data: { items: Product[]; total: number }; message: string }> => {
  const res = await instance.get(`/products/owner/${ownerId}/top-viewed?limit=${limit}`);
  return res.json();
};

export const getRatingsByOwner = async (
  ownerId: string,
  params?: { page?: number; limit?: number }
): Promise<OwnerRatingsResult> => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const res = await instance.get(`/products/rating/owner/${ownerId}?${query.toString()}`);
  const json = await res.json();

  return {
    success: json.success ?? true,
    message: json.message,
    average: Number(json.data?.average ?? 0),
    ratings: Array.isArray(json.data?.ratings) ? json.data.ratings : [],
    total: Number(json.data?.total ?? 0),
    page: Number(json.data?.page ?? params?.page ?? 1),
    limit: Number(json.data?.limit ?? params?.limit ?? 20),
  };
};

export const createRating = async (formData: FormData): Promise<{
  success: boolean;
  message: string;
  data?: Rating;
}> => {
  const res = await instance.post("/products/rating", formData);
  return res.json();
};

export const updateRating = async (
  ratingId: string,
  payload: { rating?: number; comment?: string; images?: string[] }
): Promise<{ success: boolean; message: string; data?: Rating }> => {
  const res = await instance.put(`/products/rating/${ratingId}`, payload);
  return res.json();
};

export const deleteRating = async (ratingId: string, renterId: string): Promise<{
  success: boolean;
  message: string;
}> => {
  const res = await instance.delete(`/products/rating/${ratingId}`, {
    body: JSON.stringify({ renterId }),
  });
  return res.json();
};

export const addToFavorites = async (productId: string): Promise<{ success: boolean; message: string }> => {
  const res = await instance.post(`/products/${productId}/favorite`);
  return res.json();
};

export const removeFromFavorites = async (productId: string): Promise<{ success: boolean; message: string }> => {
  const res = await instance.delete(`/products/${productId}/favorite`);
  return res.json();
};

export const getFavorites = async (page = 1, limit = 20): Promise<{
  success: boolean;
  data: PaginatedProducts;
  message: string;
}> => {
  return instance
    .get(`/products/favorites?page=${page}&limit=${limit}`)
    .then((res) => res.json());
};