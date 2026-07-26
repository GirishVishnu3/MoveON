import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

export interface DriverProfileData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  dob: string;
  gender: string;
  profilePhotoUrl: string;
  preferredLanguage: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  streetAddress: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
}

export interface DriverState {
  driver: any | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  registrationStep: number;
  draft: DriverProfileData;
  isDraftSaved: boolean;
  loading: boolean;
  error: string | null;
}

const initialDraft: DriverProfileData = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
  dob: '',
  gender: 'MALE',
  profilePhotoUrl: '',
  preferredLanguage: 'en',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  streetAddress: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
};

const initialState: DriverState = {
  driver: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  registrationStep: 1,
  draft: initialDraft,
  isDraftSaved: false,
  loading: false,
  error: null,
};

export const driverAuthSlice = createSlice({
  name: 'driverAuth',
  initialState,
  reducers: {
    setRegistrationStep(state, action: PayloadAction<number>) {
      state.registrationStep = action.payload;
    },
    updateDraft(state, action: PayloadAction<Partial<DriverProfileData>>) {
      state.draft = { ...state.draft, ...action.payload };
      state.isDraftSaved = true;
    },
    resetDraft(state) {
      state.draft = initialDraft;
      state.registrationStep = 1;
      state.isDraftSaved = false;
    },
    setDriverAuth(state, action: PayloadAction<{ driver: any; token: string; refreshToken: string }>) {
      state.driver = action.payload.driver;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
    },
    logoutDriver(state) {
      state.driver = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
    setDriverError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setDriverLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    }
  },
});

export const {
  setRegistrationStep,
  updateDraft,
  resetDraft,
  setDriverAuth,
  logoutDriver,
  setDriverError,
  setDriverLoading,
} = driverAuthSlice.actions;

export const selectDriverAuth = (state: RootState) => state.driverAuth;

export default driverAuthSlice.reducer;
