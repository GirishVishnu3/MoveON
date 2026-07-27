import React from 'react';
import type { Vehicle, FareBreakdownData, CouponResult } from '../../types/booking';

interface RideSummaryProps {
  pickupAddress: string;
  destinationAddress: string;
  vehicle: Vehicle | null;
  fareBreakdown: FareBreakdownData | null;
  couponResult: CouponResult | null;
  paymentMethod: string;
  distanceKm?: number;
  durationMin?: number;
}

export default function RideSummary({
  pickupAddress, destinationAddress, vehicle, fareBreakdown, couponResult, paymentMethod, distanceKm, durationMin,
}: RideSummaryProps) {
  const couponDiscount = couponResult?.valid ? (couponResult.discount_amount || 0) : 0;
  const totalFare = fareBreakdown ? Math.max(0, fareBreakdown.total_fare - couponDiscount) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <h3 className="font-semibold text-gray-800">Trip Summary</h3>

      {/* Route */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
          <p className="text-sm text-gray-700 leading-snug">{pickupAddress || 'Pickup not set'}</p>
        </div>
        <div className="ml-1 border-l-2 border-dashed border-gray-200 h-4" />
        <div className="flex items-start gap-2">
          <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
          <p className="text-sm text-gray-700 leading-snug">{destinationAddress || 'Destination not set'}</p>
        </div>
      </div>

      {/* Distance / Duration */}
      {distanceKm !== undefined && (
        <div className="flex gap-4 text-sm text-gray-500">
          <span>📏 {distanceKm.toFixed(1)} km</span>
          <span>⏱ ~{Math.ceil(durationMin || 0)} mins</span>
        </div>
      )}

      {/* Vehicle */}
      {vehicle && (
        <div className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-gray-700 font-medium">{vehicle.display_name}</span>
          <span className="text-gray-500">{vehicle.comfort} · {vehicle.seats} seats</span>
        </div>
      )}

      {/* Fare */}
      {fareBreakdown && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Estimated Fare</span>
          <div className="text-right">
            {couponDiscount > 0 && (
              <span className="text-xs line-through text-gray-400 mr-1">₹{fareBreakdown.total_fare.toFixed(0)}</span>
            )}
            <span className="font-bold text-blue-600 text-lg">₹{totalFare.toFixed(0)}</span>
          </div>
        </div>
      )}

    </div>
  );
}
