import React from 'react';
import type { FareBreakdownData } from '../../types/booking';

interface FareBreakdownProps {
  fare: FareBreakdownData;
  couponDiscount?: number;
  couponCode?: string;
}

interface LineItem { label: string; amount: number; highlight?: string; }

export default function FareBreakdownPanel({ fare, couponDiscount = 0, couponCode }: FareBreakdownProps) {
  // Support both old and new field names
  const distanceLabel = fare.effective_distance_km ?? fare.distance_km ?? 0;
  const timeFare = fare.time_fare ?? fare.duration_fare ?? 0;
  const surgeMultiplier = fare.surge_multiplier ?? 1;
  const surgeAmount = fare.surge_amount ?? fare.surge_charge ?? 0;
  const nightAmount = fare.night_amount ?? fare.night_charge ?? 0;
  const stateTax = fare.state_tax ?? 0;

  const items: LineItem[] = [
    { label: 'Base Fare', amount: fare.base_fare },
    { label: `Distance (${Number(distanceLabel).toFixed(1)} km)`, amount: fare.distance_fare },
  ];

  if (timeFare > 0) items.push({ label: 'Time Charge', amount: timeFare });
  if (surgeAmount > 0) items.push({ label: `Surge (${surgeMultiplier}x)`, amount: surgeAmount, highlight: 'text-orange-500' });
  if (nightAmount > 0) items.push({ label: 'Night Charge', amount: nightAmount });
  if ((fare.peak_amount ?? 0) > 0) items.push({ label: 'Peak Hour', amount: fare.peak_amount!, highlight: 'text-orange-500' });
  if ((fare.weather_amount ?? 0) > 0) items.push({ label: 'Weather Surcharge', amount: fare.weather_amount! });
  if (fare.waiting_charge > 0) items.push({ label: 'Waiting Charge', amount: fare.waiting_charge });
  if (fare.toll_charges > 0) items.push({ label: 'Toll Charges', amount: fare.toll_charges });
  if ((fare.parking_charges ?? 0) > 0) items.push({ label: 'Parking', amount: fare.parking_charges! });
  if ((fare.airport_pickup_charge ?? 0) > 0) items.push({ label: 'Airport Pickup', amount: fare.airport_pickup_charge! });
  if ((fare.airport_drop_charge ?? 0) > 0) items.push({ label: 'Airport Drop', amount: fare.airport_drop_charge! });
  if (fare.driver_allowance > 0) items.push({ label: 'Driver Allowance', amount: fare.driver_allowance });
  if (stateTax > 0) items.push({ label: 'State Tax', amount: stateTax });
  if ((fare.gst_amount ?? 0) > 0) items.push({ label: `GST (${fare.gst_percentage ?? 5}%)`, amount: fare.gst_amount! });
  if ((fare.insurance_fee ?? 0) > 0) items.push({ label: 'Insurance', amount: fare.insurance_fee! });
  if ((fare.platform_fee ?? 0) > 0) items.push({ label: 'Platform Fee', amount: fare.platform_fee! });

  const subtotal = fare.subtotal_before_discounts ?? fare.total_fare;
  const effectiveCoupon = fare.coupon_discount > 0 ? fare.coupon_discount : couponDiscount;
  const effectiveCouponCode = fare.coupon_code ?? couponCode;
  const finalFare = Math.max(0, fare.total_fare - (couponDiscount > 0 ? couponDiscount : 0));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-3">Fare Breakdown</h3>
      {fare.pricing_version_tag && (
        <p className="text-xs text-gray-400 mb-3 font-mono">{fare.pricing_version_tag}</p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className={`text-gray-600 ${item.highlight || ''}`}>{item.label}</span>
            <span className={`font-medium ${item.highlight || 'text-gray-800'}`}>₹{item.amount.toFixed(2)}</span>
          </div>
        ))}

        <div className="border-t border-dashed border-gray-200 my-1" />

        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-700">Subtotal</span>
          <span>₹{Number(subtotal).toFixed(2)}</span>
        </div>

        {effectiveCoupon > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Coupon {effectiveCouponCode ? `(${effectiveCouponCode})` : ''}</span>
            <span className="font-medium text-green-600">−₹{effectiveCoupon.toFixed(2)}</span>
          </div>
        )}

        <div className="border-t border-gray-200 mt-1 pt-2 flex justify-between font-bold text-base">
          <span className="text-gray-900">Total</span>
          <span className="text-blue-600">₹{finalFare.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
