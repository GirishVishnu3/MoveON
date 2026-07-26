import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TripStatus =
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'PASSENGER_ONBOARDED'
  | 'TRIP_STARTED'
  | 'TRIP_IN_PROGRESS'
  | 'STOP_ADDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED'
  | 'SOS_ACTIVE'
  | null;

export interface LiveLocation {
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface TripEvent {
  old_status?: string | null;
  new_status: string;
  changed_at: string;
  reason?: string;
}

export interface TripState {
  bookingRef: string | null;
  status: TripStatus;
  driverLocation: LiveLocation | null;
  passengerLocation: LiveLocation | null;
  etaMinutes: number | null;
  remainingDistanceKm: number | null;
  polylineRoute: [number, number][] | null;
  timeline: TripEvent[];
  sosActive: boolean;
  finalFare: number | null;
}

const initialState: TripState = {
  bookingRef: null,
  status: null,
  driverLocation: null,
  passengerLocation: null,
  etaMinutes: null,
  remainingDistanceKm: null,
  polylineRoute: null,
  timeline: [],
  sosActive: false,
  finalFare: null,
};

export const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    initializeTrip(state, action: PayloadAction<{ bookingRef: string; status: TripStatus }>) {
      state.bookingRef = action.payload.bookingRef;
      state.status = action.payload.status;
    },
    updateTripStatus(state, action: PayloadAction<{ status: TripStatus; message?: string }>) {
      state.status = action.payload.status;
      if (action.payload.status === 'SOS_ACTIVE') {
        state.sosActive = true;
      }
    },
    updateDriverLocation(state, action: PayloadAction<{ location: LiveLocation; etaMinutes?: number }>) {
      state.driverLocation = action.payload.location;
      if (action.payload.etaMinutes !== undefined) {
        state.etaMinutes = action.payload.etaMinutes;
      }
    },
    updatePassengerLocation(state, action: PayloadAction<LiveLocation>) {
      state.passengerLocation = action.payload;
    },
    setTimeline(state, action: PayloadAction<TripEvent[]>) {
      state.timeline = action.payload;
    },
    setRoute(state, action: PayloadAction<{ polyline: [number, number][]; distanceKm: number }>) {
      state.polylineRoute = action.payload.polyline;
      state.remainingDistanceKm = action.payload.distanceKm;
    },
    setFinalFare(state, action: PayloadAction<number>) {
      state.finalFare = action.payload;
      state.status = 'COMPLETED';
    },
    activateSOS(state) {
      state.sosActive = true;
      state.status = 'SOS_ACTIVE';
    },
    resetTrip() {
      return initialState;
    },
  },
});

export const {
  initializeTrip,
  updateTripStatus,
  updateDriverLocation,
  updatePassengerLocation,
  setTimeline,
  setRoute,
  setFinalFare,
  activateSOS,
  resetTrip,
} = tripSlice.actions;

export default tripSlice.reducer;
