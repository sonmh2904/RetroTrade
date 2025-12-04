import instance from "../customizeAPI";

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      error: true,
      message: data.message || `HTTP error! status: ${res.status}`,
    };
  }

  return data;
};

export const homeApi = {
  getHighlightPosts: async () => {
    try {
      const res = await instance.get('/home/highlight-posts');
      return handleResponse(res);
    } catch (error) {
      console.error('Error fetching highlight posts:', error);
      throw error;
    }
  }
};