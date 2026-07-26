import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  metadata_data?: any;
  created_at: string;
}

export interface NotificationPreference {
  category: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
}

export interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  preferences: NotificationPreference[];
  isLoading: boolean;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  preferences: [],
  isLoading: false,
};

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setNotifications(state, action: PayloadAction<NotificationItem[]>) {
      state.items = action.payload;
      state.unreadCount = action.payload.filter(n => !n.is_read).length;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      // Prepend to list
      state.items.unshift(action.payload);
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    markAsRead(state, action: PayloadAction<string>) {
      const item = state.items.find(n => n.id === action.payload);
      if (item && !item.is_read) {
        item.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead(state) {
      state.items.forEach(n => { n.is_read = true; });
      state.unreadCount = 0;
    },
    setPreferences(state, action: PayloadAction<NotificationPreference[]>) {
      state.preferences = action.payload;
    }
  },
});

export const { 
  setLoading, 
  setNotifications, 
  addNotification, 
  markAsRead, 
  markAllAsRead, 
  setPreferences 
} = notificationSlice.actions;

export default notificationSlice.reducer;
