import { store } from '../store/redux_store';
import { logout, login } from '../store/auth/authReducer';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9999/api/v1';

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: Error) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

// Extended RequestInit interface to include _retry property
interface ExtendedRequestInit extends RequestInit {
  _retry?: boolean;
}

// Custom fetch wrapper with interceptors functionality
const customFetch = async (url: string, options: ExtendedRequestInit = {}): Promise<Response> => {
  // normalize headers (support Headers instance)
  const incomingHeaders: Record<string, string> =
    options.headers instanceof Headers
      ? Object.fromEntries((options.headers as Headers).entries())
      : (options.headers as Record<string, string>) || {};

  // Request interceptor - add auth token
  const token = store.getState().auth?.accessToken;

  if (token) {
    incomingHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Add default headers ONLY when there is a body and it's not FormData
  if (options.body && !(options.body instanceof FormData)) {
    incomingHeaders['Content-Type'] = incomingHeaders['Content-Type'] || "application/json";
  }

  options.headers = incomingHeaders;

  // ensure CORS mode by default (adjust if your backend requires credentials)
  options.mode = options.mode ?? 'cors';

  try {
    const response = await fetch(url, options);

    // Response interceptor - handle token refresh
    if (!response.ok && [401, 403].includes(response.status)) {
      const originalRequest = { url, options };

      if (!originalRequest.options._retry) {
        originalRequest.options._retry = true;
        const { refreshToken } = store.getState().auth || {};

        if (!refreshToken) {
          store.dispatch(logout());
          throw new Error('No refresh token available');
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.options.headers = {
                ...originalRequest.options.headers,
                'Authorization': 'Bearer ' + token,
              };
              return customFetch(originalRequest.url, originalRequest.options);
            })
            .catch(err => Promise.reject(err));
        }

        isRefreshing = true;

        try {
          const refreshResponse = await fetch(`${BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (!refreshResponse.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await refreshResponse.json();
          const { accessToken } = data;

          store.dispatch(login({ accessToken, refreshToken }));
          processQueue(null, accessToken);

          originalRequest.options.headers = {
            ...originalRequest.options.headers,
            'Authorization': 'Bearer ' + accessToken,
          };

          return customFetch(originalRequest.url, originalRequest.options);
        } catch (err) {
          processQueue(err as Error, null);
          store.dispatch(logout());
          throw err;
        } finally {
          isRefreshing = false;
        }
      }
    }

    return response;
  } catch (error) {
    // Improve diagnostics for network / CORS failures
    const err = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Network or CORS error while fetching "${url}": ${err.message}`);
  }
};



const api = {
  get: (url: string, options: ExtendedRequestInit = {}) =>
    customFetch(`${BASE_URL}${url}`, { ...options, method: "GET" }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: (url: string, data?: any, options: ExtendedRequestInit = {}) => {
    const isFormData = data instanceof FormData;

    const headers = isFormData
      ? options.headers
      : { "Content-Type": "application/json", ...options.headers };

    const body = isFormData ? data : data ? JSON.stringify(data) : undefined;

    return customFetch(`${BASE_URL}${url}`, {
      ...options,
      method: "POST",
      headers,
      body,
    });
  },

  put: (url: string, data?: unknown, options: ExtendedRequestInit = {}) => {
    const isFormData = data instanceof FormData;

    const headers = isFormData
      ? options.headers
      : { "Content-Type": "application/json", ...options.headers };

    const body = isFormData ? data : data ? JSON.stringify(data) : undefined;

    return customFetch(`${BASE_URL}${url}`, {
      ...options,
      method: "PUT",
      headers,
      body,
    });
  },

  delete: (url: string, options: ExtendedRequestInit = {}) =>
    customFetch(`${BASE_URL}${url}`, { ...options, method: "DELETE" }),

  patch: (url: string, data?: unknown, options: ExtendedRequestInit = {}) =>
    customFetch(`${BASE_URL}${url}`, {
      ...options,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
};

export default api;
