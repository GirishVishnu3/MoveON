import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import locationReducer from './locationSlice';
import bookingReducer from './bookingSlice';
import dispatchReducer from './dispatchSlice';
import tripReducer from './tripSlice';
import walletReducer from './walletSlice';
import paymentReducer from './paymentSlice';
import notificationReducer from './notificationSlice';
import adminReducer from './adminSlice';
import driverAuthReducer from './driverAuthSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    driverAuth: driverAuthReducer,
    location: locationReducer,
    booking: bookingReducer,
    dispatch: dispatchReducer,
    trip: tripReducer,
    wallet: walletReducer,
    payment: paymentReducer,
    notification: notificationReducer,
    admin: adminReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
