import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

export type RideType = 'INTERCITY' | 'INTRACITY' | null;

export interface Coordinate {
  lat: number;
  lon: number;
  address?: string;
}

export interface RouteInfo {
  distanceMeters?: number;
  durationSeconds?: number;
  geometry?: GeoJSON.Geometry;
}

export interface LocationState {
  rideType: RideType;
  pickup: Coordinate | null;
  destination: Coordinate | null;
  route: RouteInfo | null;
  recentSearches: string[]; // store address strings
  favorites: string[];
}

const initialState: LocationState = {
  rideType: null,
  pickup: null,
  destination: null,
  route: null,
  recentSearches: [],
  favorites: [],
};

export const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setRideType(state, action: PayloadAction<RideType>) {
      state.rideType = action.payload;
    },
    setPickup(state, action: PayloadAction<Coordinate | null>) {
      state.pickup = action.payload;
    },
    setDestination(state, action: PayloadAction<Coordinate | null>) {
      state.destination = action.payload;
    },
    setRoute(state, action: PayloadAction<RouteInfo>) {
      state.route = action.payload;
    },
    clearRoute(state) {
      state.route = null;
    },
    swapLocations(state) {
      const temp = state.pickup;
      state.pickup = state.destination;
      state.destination = temp;
    },
    addRecentSearch(state, action: PayloadAction<string>) {
      if (!state.recentSearches.includes(action.payload)) {
        state.recentSearches.unshift(action.payload);
        if (state.recentSearches.length > 10) state.recentSearches.pop();
      }
    },
    addFavorite(state, action: PayloadAction<string>) {
      if (!state.favorites.includes(action.payload)) {
        state.favorites.push(action.payload);
      }
    },
    clearLocationState(state) {
      state.pickup = null;
      state.destination = null;
      state.route = null;
    },
  },
});

export const {
  setRideType,
  setPickup,
  setDestination,
  setRoute,
  clearRoute,
  swapLocations,
  addRecentSearch,
  addFavorite,
  clearLocationState,
} = locationSlice.actions;

export const selectLocation = (state: RootState) => state.location;

export default locationSlice.reducer;
