import axios from 'axios';
import { store } from '../store';
import { setTokens, logout } from '../store/authSlice';

// Create a base instance
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://moveon-backend-production-c80c.up.railway.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const state = store.getState();
    let token = state.auth.accessToken;
    
    // Fallback to localStorage if Redux hasn't hydrated yet
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('access_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If we receive a 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const state = store.getState();
      let refreshToken = state.auth.refreshToken;
      
      // Fallback for refresh token
      if (!refreshToken && typeof window !== 'undefined') {
        refreshToken = localStorage.getItem('refresh_token');
      }
      
      if (refreshToken) {
        try {
          const res = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          if (res.data) {
            store.dispatch(setTokens({
              accessToken: res.data.access_token,
              refreshToken: res.data.refresh_token,
            }));
            
            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
            return axios(originalRequest);
          }
        } catch (refreshError) {
          // If refresh fails, log out
          store.dispatch(logout());
          return Promise.reject(refreshError);
        }
      } else {
        store.dispatch(logout());
      }
    }
    
    return Promise.reject(error);
  }
);
