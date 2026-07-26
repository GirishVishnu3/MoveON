// ─── Vehicle Types ─────────────────────────────────────────────────────────

export interface FareItem {
  label: string;
  amount: number;
}

export interface FareBreakdownData {
  // Identifiers
  pricing_rule_version_id?: string;
  pricing_version_tag?: string;
  base_rate_id?: string;
  city_id?: string | null;
  city_name?: string;

  // Trip metadata
  ride_type: string;
  vehicle_category: string;
  is_round_trip?: boolean;
  effective_distance_km?: number;
  currency?: string;
  calculated_at?: string;

  // Legacy compat (old field names still accepted)
  distance_km?: number;
  duration_min?: number;

  // Core fare components
  base_fare: number;
  distance_fare: number;
  time_fare?: number;        // new name (was duration_fare)
  duration_fare?: number;    // old name — kept for backwards compat
  subtotal_raw?: number;
  minimum_fare?: number;
  minimum_fare_applied?: boolean;

  // Multipliers
  peak_multiplier?: number;
  peak_amount?: number;
  night_multiplier?: number;
  night_amount?: number;
  holiday_multiplier?: number;
  holiday_amount?: number;
  surge_multiplier?: number;
  surge_amount?: number;     // new name
  surge_charge?: number;     // old name — kept for backwards compat
  weather_multiplier?: number;
  weather_amount?: number;

  // After multipliers
  subtotal_after_multipliers?: number;

  // Incidentals
  waiting_charge: number;
  toll_charges: number;
  parking_charges?: number;
  airport_pickup_charge?: number;
  airport_drop_charge?: number;
  driver_allowance: number;
  state_border_charge?: number;
  night_charge?: number;     // old name — kept for backwards compat

  // After incidentals
  subtotal_after_incidentals?: number;

  // Discounts
  coupon_code?: string | null;
  coupon_discount: number;
  wallet_deduction?: number;
  total_discounts?: number;
  subtotal_after_discounts?: number;
  subtotal_before_discounts?: number;

  // Taxes & fees
  gst_percentage?: number;
  gst_amount?: number;
  insurance_fee?: number;
  platform_fee?: number;
  state_tax?: number;        // old name — kept for backwards compat

  // Total
  total_fare: number;
  final_fare_unrounded?: number;

  // Breakdown summary
  breakdown?: Record<string, number>;

  // Legacy compat
  is_peak?: boolean;
}

export interface Vehicle {
  category: string;
  display_name: string;
  icon: string;
  seats: number;
  luggage: string;
  comfort: string;
  fuel_type: string;
  cancellation_policy: string;
  eta_min: number;
  eta_max: number;
  eta_display: string;
  fare: number;
  fare_breakdown: FareBreakdownData;
  ride_types: string[];
}

// ─── Booking Preferences ───────────────────────────────────────────────────

export interface BookingPreferences {
  preferred_language: string;
  air_conditioning: boolean;
  pet_friendly: boolean;
  wheelchair_accessible: boolean;
  female_driver_preferred: boolean;
  child_seat: boolean;
  silent_ride: boolean;
  music_preference: string | null;
  special_instructions: string | null;
}

export const defaultPreferences: BookingPreferences = {
  preferred_language: 'en',
  air_conditioning: true,
  pet_friendly: false,
  wheelchair_accessible: false,
  female_driver_preferred: false,
  child_seat: false,
  silent_ride: false,
  music_preference: null,
  special_instructions: null,
};

// ─── Coupon ────────────────────────────────────────────────────────────────

export interface CouponResult {
  valid: boolean;
  code?: string;
  description?: string;
  discount_type?: string;
  discount_amount?: number;
  final_fare?: number;
  error?: string;
}

// ─── Booking ──────────────────────────────────────────────────────────────

export type TripType = 'NOW' | 'SCHEDULED' | 'ROUND_TRIP';
export type BookingStatus = 'PENDING' | 'SEARCHING' | 'DRIVER_ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  booking_ref: string;
  status: BookingStatus;
  ride_type: string;
  vehicle_category: string;
  pickup_address: string;
  destination_address: string;
  distance_km: number;
  duration_min: number;
  scheduled_at?: string;
  payment_method: string;
  created_at: string;
}
