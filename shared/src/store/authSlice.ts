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

/** Returns true if the token looks like a real JWT (3 base64 parts). */
function isRealJwt(token: string): boolean {
  return token.split('.').length === 3;
}

/**
 * Attempt to decode a JWT and return a UserState.
 * Returns null if decoding fails.
 */
function tryDecodeJwt(token: string): UserState | null {
  try {
    const decoded: any = jwtDecode(token);
    return {
      id: decoded.sub,
      role: decoded.role ?? 'RIDER',
      status: 'ACTIVE',
      phone_number: decoded.phone_number || decoded.sub,
    };
  } catch {
    return null;
  }
}

/**
 * Build a demo UserState from localStorage extras.
 * Used when we only have a demo_ token, not a real JWT.
 */
function buildDemoUser(): UserState {
  const phone =
    (typeof window !== 'undefined' && localStorage.getItem('user_phone')) || 'demo_user';
  const role =
    (typeof window !== 'undefined' && localStorage.getItem('user_role')) || 'RIDER';
  return {
    id: 'demo_' + phone,
    role,
    status: 'ACTIVE',
    phone_number: phone,
  };
}

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

          if (isRealJwt(accessToken)) {
            // Normal real JWT path
            const decoded = tryDecodeJwt(accessToken);
            if (decoded) {
              state.user = decoded;
              state.isAuthenticated = true;
            } else {
              // Malformed JWT — clear everything
              state.isAuthenticated = false;
              state.user = null;
              state.accessToken = null;
              state.refreshToken = null;
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
            }
          } else {
            // Demo token path — trust localStorage, build a demo user
            state.isAuthenticated = true;
            state.user = buildDemoUser();
          }
        }
      }
      state.isLoading = false;
    },

    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      const { accessToken, refreshToken } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
      }

      if (isRealJwt(accessToken)) {
        const decoded = tryDecodeJwt(accessToken);
        if (decoded) {
          state.user = decoded;
        }
      } else {
        // Demo token — build user from localStorage extras
        state.user = buildDemoUser();
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
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_phone');
      }
    },
  },
});

export const { hydrateAuth, setTokens, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
