import api from "../customizeAPI";
import type { UpdateProfileRequest, UpdateAvatarRequest, ChangePasswordRequest, UserProfile, ApiResponse, ProfileApiResponse } from "@iService";

// Helper function to parse response
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseResponse = async (response: Response): Promise<ApiResponse<any>> => {
    try {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return data;
        } else {
            // If not JSON, return error response
            const text = await response.text();
            return {
                code: response.status,
                message: text || 'Unexpected response format',
                data: undefined
            };
        }
    } catch (error) {
        console.error('Error parsing response:', error);
        return {
            code: response.status || 500,
            message: 'Failed to parse response',
            data: undefined
        };
    }
};

// Helper function to parse profile response specifically
const parseProfileResponse = async (response: Response): Promise<ProfileApiResponse> => {
    try {
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            return data as ProfileApiResponse;
        } else {
            // If not JSON, return error response
            const text = await response.text();
            return {
                code: response.status,
                message: text || 'Unexpected response format',
                data: undefined,
                user: undefined
            };
        }
    } catch (error) {
        console.error('Error parsing profile response:', error);
        return {
            code: response.status || 500,
            message: 'Failed to parse response',
            data: undefined,
            user: undefined
        };
    }
};

// Profile APIs
export const getUserProfile = async (): Promise<ProfileApiResponse> => {
    const response = await api.get("/user/profile/me");
    return await parseProfileResponse(response);
};

export const updateUserProfile = async (payload: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> => {
    const response = await api.put("/user/profile", payload);
    return await parseResponse(response);
};

// Upload avatar file
export const uploadUserAvatar = async (file: File): Promise<ApiResponse<UserProfile>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post("/auth/profile/avatar", formData);
    return await parseResponse(response);
};

// Update avatar with URL
export const updateUserAvatar = async (payload: UpdateAvatarRequest): Promise<ApiResponse<UserProfile>> => {
    const response = await api.post("/auth/profile/avatar", payload);
    return await parseResponse(response);
};

export const verifyPassword = async (password: string): Promise<ApiResponse<null>> => {
    const response = await api.post("/user/profile/verify-password", { password });
    return await parseResponse(response);
};

export const changePassword = async (payload: ChangePasswordRequest): Promise<ApiResponse<null>> => {
    const response = await api.put("/user/profile/change-password", payload);
    return await parseResponse(response);
};

// User Management APIs
export const getAllUsers = async (
    page: number = 1, 
    limit: number = 10, 
    onlyBanned: boolean = false,
    search: string = '',
    role: string = '',
    status: string = ''
): Promise<ApiResponse<{ items: UserProfile[], totalPages: number, totalItems: number }>> => {
    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(onlyBanned && { onlyBanned: "true" }),
        ...(search && { search }),
        ...(role && role !== 'all' && { role }),
        ...(status && status !== 'all' && { status })
    });
    const response = await api.get(`/user?${queryParams}`);
    return await parseResponse(response);
};

// Moderator: Lấy danh sách user cần xử lý (có report, complaint, dispute, hoặc đã bị ban)
export const getUsersForModeration = async (
    page: number = 1, 
    limit: number = 10, 
    search: string = '',
    role: string = '',
    status: string = '',
    issueType: string = '' // 'complaint', 'report', 'dispute', 'banned', hoặc 'all'
): Promise<ApiResponse<{ items: UserProfile[], totalPages: number, totalItems: number }>> => {
    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(role && role !== 'all' && { role }),
        ...(status && status !== 'all' && { status }),
        ...(issueType && issueType !== 'all' && { issueType })
    });
    const response = await api.get(`/user/moderation?${queryParams}`);
    return await parseResponse(response);
};

export const getUserById = async (id: string): Promise<ApiResponse<UserProfile>> => {
    const response = await api.get(`/user/${id}`);
    return await parseResponse(response);
};

export const createUser = async (payload: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> => {
    const response = await api.post("/user", payload);
    return await parseResponse(response);
};

export const updateUser = async (id: string, payload: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> => {
    const response = await api.put(`/user/${id}`, payload);
    return await parseResponse(response);
};

export const deleteUser = async (id: string): Promise<ApiResponse<UserProfile>> => {
    const response = await api.delete(`/user/${id}`);
    return await parseResponse(response);
};

export const updateUserRole = async (id: string, role: string): Promise<ApiResponse<UserProfile>> => {
    const response = await api.put("/user/role/update", { id, role });
    return await parseResponse(response);
};

// Ban user (soft delete) - admin only
export const banUser = async (id: string, reason: string): Promise<ApiResponse<UserProfile>> => {
    const response = await api.post(`/user/${id}/ban`, { reason });
    return await parseResponse(response);
};

// Unban user (restore) - admin only
export const unbanUser = async (id: string): Promise<ApiResponse<UserProfile>> => {
    const response = await api.post(`/user/${id}/unban`);
    return await parseResponse(response);
};

// Update ID card information
export interface UpdateIdCardInfoRequest {
    idNumber: string;
    fullName: string;
    dateOfBirth: string;
    address: string;
}

export const updateIdCardInfo = async (payload: UpdateIdCardInfoRequest): Promise<ApiResponse<UserProfile>> => {
    const response = await api.put("/user/profile/id-card-info", payload);
    return await parseResponse(response);
};

