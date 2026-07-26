import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';

export interface UserState {
  id: string;
  role: string;
  status: string;
  phone_number?: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: UserState | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrateAuth(state) {
      if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        if (accessToken && refreshToken) {
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
          try {
            const decoded: any = jwtDecode(accessToken);
            state.user = {
              id: decoded.sub,
              role: decoded.role,
              status: 'ACTIVE',
              phone_number: decoded.phone_number || decoded.sub,
            };
          } catch (e) {
            console.error("Token decoding failed during hydration", e);
            state.isAuthenticated = false;
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      }
      state.isLoading = false;
    },
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', action.payload.accessToken);
        localStorage.setItem('refresh_token', action.payload.refreshToken);
      }
      
      try {
        const decoded: any = jwtDecode(action.payload.accessToken);
        state.user = {
          id: decoded.sub,
          role: decoded.role,
          status: 'ACTIVE',
          phone_number: decoded.phone_number || decoded.sub,
        };
      } catch (e) {
        console.error("Token decoding failed", e);
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.user = null;
      state.isLoading = false;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
  },
});

export const { hydrateAuth, setTokens, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
