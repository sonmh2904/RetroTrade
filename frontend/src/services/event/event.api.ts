import api from "../customizeAPI";

export type DisplayType =
  | "christmas-tree"
  | "peach-blossom"
  | "apricot-blossom"
  | "both-tet-trees"
  | "vietnam-flag"
  | "halloween-pumpkin"
  | "none";

export interface EventTheme {
  snowfall?: boolean;
  decorations?: boolean;
  countdownEnabled?: boolean; 
  countdownTargetDate?: string;
  countdownType?: "default" | "christmas" | "newyear" | "tet" | "national-day"; 
  cardTitle?: string;
  cardMessage?: string;
  badgeText?: string;
  buttonText1?: string;
  buttonLink1?: string;
  buttonText2?: string;
  buttonLink2?: string;
  displayType: DisplayType;
  decorationEmojis?: string[];
  featureImageUrl?: string;
}

export interface Event {
  _id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  theme: EventTheme;
  createdBy?: {
    _id: string;
    fullName?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  event?: Event;
  data?: Event | Event[];
  message?: string;
}

// Public
export const getCurrentEvent = async (): Promise<Event | null> => {
  const response = await api.get("/events/current");
  const data: ApiResponse = await response.json();

  if (data.success && data.event) {
    return data.event;
  }

  return null;
};

// Admin
export const uploadFeatureImage = async (
  eventId: string,
  file: File
): Promise<Event> => {
  const formData = new FormData();
  formData.append("featureImage", file);

  const response = await api.post(`/events/${eventId}/feature-image`, formData);
  const data: ApiResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.message || "Upload ảnh thất bại");
  }

  return data.data as Event;
};

export const getAllEvents = async (): Promise<Event[]> => {
  const response = await api.get("/events");
  const data: ApiResponse = await response.json();

  if (data.success && Array.isArray(data.data)) {
    return data.data;
  }

  return [];
};

export const createEvent = async (
  payload: Omit<Event, "_id" | "createdAt" | "updatedAt" | "createdBy">
): Promise<Event> => {
  const response = await api.post("/events", payload);
  const data: ApiResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.message || "Tạo sự kiện thất bại");
  }

  return data.data as Event;
};

export const updateEvent = async (
  id: string,
  payload: Partial<
    EventTheme & {
      name?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    }
  >
): Promise<Event> => {
  const response = await api.put(`/events/${id}`, payload);
  const data: ApiResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.message || "Cập nhật sự kiện thất bại");
  }

  return data.data as Event;
};

export const deleteEvent = async (id: string): Promise<void> => {
  const response = await api.delete(`/events/${id}`);
  const data: ApiResponse = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Xóa sự kiện thất bại");
  }
};

export const toggleEventActive = async (id: string): Promise<Event> => {
  const response = await api.patch(`/events/${id}/toggle`);
  const data: ApiResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.message || "Thay đổi trạng thái thất bại");
  }

  return data.data as Event;
};
