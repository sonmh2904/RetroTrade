import instance from "../customizeAPI";

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      error: true,
      message: data.message || `HTTP error! status: ${res.status}`,
    };
  }

  return data;
};

interface TagData {
  name: string;
}

interface CategoryData {
  name: string;
  description?: string;
}

export interface Tag {
  _id: string;
  name: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  slug?: string;
  parentCategoryId?: string | null;
  isActive?: boolean;
  level?: number;
}



export const getAllPosts = async (page = 1, limit = 10) => {
  const res = await instance.get(`/post/posts?page=${page}&limit=${limit}`);
  return handleResponse(res);
};


export const getBlogDetail = async (id: string) => {
  const res = await instance.get(`/post/posts/${id}`);
  return handleResponse(res);
};


export const getAllCategories = async () => {
  const res = await instance.get(`/post/categories`);
  return handleResponse(res);
};


export const getAllTags = async () => {
  const res = await instance.get(`/post/tags`);
  return handleResponse(res);
};


export const getPostsByCategory = async (id: string, page = 1, limit = 6) => {
  const res = await instance.get(
    `/post/posts/category/${id}?page=${page}&limit=${limit}`
  );
  return handleResponse(res);
};


export const getPostsByTag = async (id: string, page = 1, limit = 6) => {
  const res = await instance.get(
    `/post/posts/tag/${id}?page=${page}&limit=${limit}`
  );
  return handleResponse(res);
};


export const createTag = async (data: TagData) => {
  const res = await instance.post(`/post/tags`, data);
  return handleResponse(res);
};

export const updateTag = async (id: string, data: TagData) => {
  const res = await instance.put(`/post/tags/${id}`, data);
  return handleResponse(res);
};

export const deleteTag = async (id: string) => {
  const res = await instance.delete(`/post/tags/${id}`);
  return handleResponse(res);
};


export const createCategory = async (data: CategoryData) => {
  const res = await instance.post(`/post/categories`, data);
  return handleResponse(res);
};

export const updateCategory = async (id: string, data: CategoryData) => {
  const res = await instance.put(`/post/categories/${id}`, data);
  return handleResponse(res);
};

export const deleteCategory = async (id: string) => {
  const res = await instance.delete(`/post/categories/${id}`);
  return handleResponse(res);
};

export const createPost = async (formData: FormData) => {
  const res = await instance.post(`/post/posts`, formData);
  return handleResponse(res);
};


export const updatePost = async (id: string, formData: FormData) => {
  const res = await instance.put(`/post/posts/${id}`, formData);
  return handleResponse(res);
};

export const deletePost = async (id: string) => {
  const res = await instance.delete(`/post/posts/${id}`);
  return handleResponse(res);
};

export const getAllComment = async () => {
  const res = await instance.get(`/post/comments`);
  return handleResponse(res);
};

export const deleteComment = async (id: string) => {
  const res = await instance.delete(`/post/comments/${id}`);
  return handleResponse(res);
};
export const banComment = async (id: string) => {
  const res = await instance.patch(`/post/comments/ban/${id}`);
  return handleResponse(res);
};

export const getCommentDetail = async (id: string) => {
  const res = await instance.get(`/post/comments/${id}`);
  return handleResponse(res);
};


export const getCommentsByPost = async (id: string) => {
  const res = await instance.get(`/post/comment/${id}`);
  return handleResponse(res);
};


export const addComment = async (id: string, data: { content: string; parentCommentId?: string }) => {
  const res = await instance.post(`/post/comments/${id}`, data);
  return handleResponse(res);
};

export const deleteCommentByUser = async (id: string) => {
  const res = await instance.delete(`/post/comments/user/${id}`);
  return handleResponse(res);
};
export const updateCommentByUser = async (id: string, data: { content: string }) => {
  const res = await instance.put(`/post/comments/${id}`, data);
  return handleResponse(res);
};
