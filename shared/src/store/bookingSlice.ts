import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Vehicle, FareBreakdownData, BookingPreferences, CouponResult, TripType, Booking } from '../types/booking';
import { defaultPreferences } from '../types/booking';

export interface BookingState {
  selectedVehicle: Vehicle | null;
  fareBreakdown: FareBreakdownData | null;
  couponCode: string;
  couponResult: CouponResult | null;
  preferences: BookingPreferences;
  paymentMethod: string;
  tripType: TripType;
  scheduledAt: string | null;   // ISO string
  returnAt: string | null;
  bookingRef: string | null;
  bookingStatus: string | null;
  isLoadingFare: boolean;
  isConfirming: boolean;
}

const initialState: BookingState = {
  selectedVehicle: null,
  fareBreakdown: null,
  couponCode: '',
  couponResult: null,
  preferences: defaultPreferences,
  paymentMethod: 'CASH',
  tripType: 'NOW',
  scheduledAt: null,
  returnAt: null,
  bookingRef: null,
  bookingStatus: null,
  isLoadingFare: false,
  isConfirming: false,
};

export const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setSelectedVehicle(state, action: PayloadAction<Vehicle | null>) {
      state.selectedVehicle = action.payload;
      if (action.payload) {
        state.fareBreakdown = action.payload.fare_breakdown;
      }
    },
    setFareBreakdown(state, action: PayloadAction<FareBreakdownData>) {
      state.fareBreakdown = action.payload;
    },
    setCouponCode(state, action: PayloadAction<string>) {
      state.couponCode = action.payload;
    },
    setCouponResult(state, action: PayloadAction<CouponResult | null>) {
      state.couponResult = action.payload;
    },
    clearCoupon(state) {
      state.couponCode = '';
      state.couponResult = null;
    },
    setPreferences(state, action: PayloadAction<Partial<BookingPreferences>>) {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    setPaymentMethod(state, action: PayloadAction<string>) {
      state.paymentMethod = action.payload;
    },
    setTripType(state, action: PayloadAction<TripType>) {
      state.tripType = action.payload;
    },
    setScheduledAt(state, action: PayloadAction<string | null>) {
      state.scheduledAt = action.payload;
    },
    setReturnAt(state, action: PayloadAction<string | null>) {
      state.returnAt = action.payload;
    },
    setBookingConfirmed(state, action: PayloadAction<{ bookingRef: string; status: string }>) {
      state.bookingRef = action.payload.bookingRef;
      state.bookingStatus = action.payload.status;
      state.isConfirming = false;
    },
    setIsLoadingFare(state, action: PayloadAction<boolean>) {
      state.isLoadingFare = action.payload;
    },
    setIsConfirming(state, action: PayloadAction<boolean>) {
      state.isConfirming = action.payload;
    },
    resetBooking() {
      return initialState;
    },
  },
});

export const {
  setSelectedVehicle,
  setFareBreakdown,
  setCouponCode,
  setCouponResult,
  clearCoupon,
  setPreferences,
  setPaymentMethod,
  setTripType,
  setScheduledAt,
  setReturnAt,
  setBookingConfirmed,
  setIsLoadingFare,
  setIsConfirming,
  resetBooking,
} = bookingSlice.actions;

export default bookingSlice.reducer;
