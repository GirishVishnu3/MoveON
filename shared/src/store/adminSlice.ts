import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AdminMetrics {
  total_riders: number;
  total_drivers: number;
  active_rides: number;
  completed_rides: number;
  total_revenue: number;
}

export interface AdminUser {
  id: string;
  role: string;
  phone_number: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string;
}

export interface AdminState {
  metrics: AdminMetrics | null;
  users: AdminUser[];
  drivers: AdminUser[];
  isLoading: boolean;
}

const initialState: AdminState = {
  metrics: null,
  users: [],
  drivers: [],
  isLoading: false,
};

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setMetrics(state, action: PayloadAction<AdminMetrics>) {
      state.metrics = action.payload;
    },
    setUsers(state, action: PayloadAction<AdminUser[]>) {
      state.users = action.payload;
    },
    setDrivers(state, action: PayloadAction<AdminUser[]>) {
      state.drivers = action.payload;
    },
    updateUserStatus(state, action: PayloadAction<{ id: string, status: string, isDriver: boolean }>) {
      const list = action.payload.isDriver ? state.drivers : state.users;
      const user = list.find(u => u.id === action.payload.id);
      if (user) {
        user.status = action.payload.status;
      }
    }
  },
});

export const { 
  setLoading, 
  setMetrics, 
  setUsers, 
  setDrivers,
  updateUserStatus 
} = adminSlice.actions;

export default adminSlice.reducer;
