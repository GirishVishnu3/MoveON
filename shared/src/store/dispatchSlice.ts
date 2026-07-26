import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type DispatchStatus = 'idle' | 'searching' | 'driver_assigned' | 'failed' | 'cancelled';

export interface AssignedDriver {
  driver_id: string;
  driver_name: string;
  vehicle_model?: string;
  vehicle_number?: string;
  rating?: number;
  phone?: string;
  eta_minutes?: number;
}

export interface DispatchState {
  status: DispatchStatus;
  bookingRef: string | null;
  assignedDriver: AssignedDriver | null;
  statusMessage: string;
  errorReason: string | null;
  wsConnected: boolean;
  // For driver-side
  incomingRide: {
    booking_ref: string;
    pickup_lat: number;
    pickup_lon: number;
    pickup_address?: string;
    destination_address?: string;
    estimated_fare?: number;
    timeout: number;
  } | null;
  timeoutCountdown: number;
}

const initialState: DispatchState = {
  status: 'idle',
  bookingRef: null,
  assignedDriver: null,
  statusMessage: '',
  errorReason: null,
  wsConnected: false,
  incomingRide: null,
  timeoutCountdown: 0,
};

export const dispatchSlice = createSlice({
  name: 'dispatch',
  initialState,
  reducers: {
    startSearch(state, action: PayloadAction<string>) {
      state.status = 'searching';
      state.bookingRef = action.payload;
      state.statusMessage = 'Searching for nearby drivers...';
      state.assignedDriver = null;
      state.errorReason = null;
    },
    updateStatusMessage(state, action: PayloadAction<string>) {
      state.statusMessage = action.payload;
    },
    driverAssigned(state, action: PayloadAction<AssignedDriver>) {
      state.status = 'driver_assigned';
      state.assignedDriver = action.payload;
      state.statusMessage = `${action.payload.driver_name} is on the way!`;
    },
    dispatchFailed(state, action: PayloadAction<string>) {
      state.status = 'failed';
      state.errorReason = action.payload;
      state.statusMessage = 'No drivers available right now.';
    },
    dispatchCancelled(state) {
      state.status = 'cancelled';
      state.statusMessage = 'Ride cancelled.';
    },
    setWsConnected(state, action: PayloadAction<boolean>) {
      state.wsConnected = action.payload;
    },
    // Driver-side actions
    setIncomingRide(state, action: PayloadAction<DispatchState['incomingRide']>) {
      state.incomingRide = action.payload;
      state.timeoutCountdown = action.payload?.timeout ?? 15;
    },
    tickCountdown(state) {
      if (state.timeoutCountdown > 0) {
        state.timeoutCountdown -= 1;
      }
    },
    clearIncomingRide(state) {
      state.incomingRide = null;
      state.timeoutCountdown = 0;
    },
    resetDispatch(state) {
      return initialState;
    },
  },
});

export const {
  startSearch,
  updateStatusMessage,
  driverAssigned,
  dispatchFailed,
  dispatchCancelled,
  setWsConnected,
  setIncomingRide,
  tickCountdown,
  clearIncomingRide,
  resetDispatch,
} = dispatchSlice.actions;

export default dispatchSlice.reducer;
