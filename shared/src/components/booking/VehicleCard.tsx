import React from 'react';
import type { Vehicle } from '../../types/booking';

// SVG icons per category
const vehicleIcons: Record<string, React.ReactNode> = {
  bike: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="16" cy="46" r="8"/><circle cx="48" cy="46" r="8"/>
      <path d="M16 46L28 22h8l8 16M28 22l8 24M36 38h-8"/>
    </svg>
  ),
  scooter: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="14" cy="46" r="8"/><circle cx="50" cy="46" r="8"/>
      <path d="M14 46l10-20h16l8 8-8 12M22 38h16"/>
    </svg>
  ),
  auto: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="24" width="44" height="24" rx="4"/>
      <path d="M8 36h44M18 24l4-10h20l4 10"/>
      <circle cx="18" cy="50" r="6"/><circle cx="46" cy="50" r="6"/>
    </svg>
  ),
  hatchback: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="30" width="56" height="20" rx="3"/>
      <path d="M4 36h56M14 30l8-12h20l8 12"/>
      <circle cx="16" cy="52" r="6"/><circle cx="48" cy="52" r="6"/>
    </svg>
  ),
  sedan: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="32" width="56" height="18" rx="3"/>
      <path d="M4 36h56M10 32l10-14h24l10 14"/>
      <circle cx="16" cy="52" r="6"/><circle cx="48" cy="52" r="6"/>
      <rect x="14" y="22" width="10" height="8" rx="1"/><rect x="40" y="22" width="10" height="8" rx="1"/>
    </svg>
  ),
  suv: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="28" width="56" height="22" rx="3"/>
      <path d="M4 36h56M8 28l8-14h32l8 14"/>
      <circle cx="16" cy="52" r="6"/><circle cx="48" cy="52" r="6"/>
    </svg>
  ),
  xl_suv: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="28" width="60" height="22" rx="3"/>
      <path d="M2 36h60M6 28l6-14h40l6 14"/>
      <circle cx="14" cy="52" r="6"/><circle cx="50" cy="52" r="6"/>
    </svg>
  ),
  premium_sedan: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="32" width="56" height="18" rx="3"/>
      <path d="M4 36h56M8 32l12-14h24l12 14"/>
      <circle cx="16" cy="52" r="6"/><circle cx="48" cy="52" r="6"/>
      <path d="M30 20v-4M24 22l-3-3M36 22l3-3"/>
    </svg>
  ),
  luxury: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="30" width="60" height="20" rx="4"/>
      <path d="M2 38h60M6 30l14-16h22l14 16"/>
      <circle cx="14" cy="52" r="7"/><circle cx="50" cy="52" r="7"/>
      <path d="M24 18h16M28 22h8"/>
    </svg>
  ),
  electric: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="30" width="56" height="20" rx="3"/>
      <path d="M4 36h56M10 30l10-14h24l10 14"/>
      <circle cx="16" cy="52" r="6"/><circle cx="48" cy="52" r="6"/>
      <path d="M30 14l-4 8h6l-4 8" strokeLinecap="round"/>
    </svg>
  ),
  shared: (
    <svg viewBox="0 0 64 64" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="30" width="56" height="20" rx="3"/>
      <path d="M4 36h56M12 30l8-12h24l8 12"/>
      <circle cx="16" cy="52" r="6"/><circle cx="48" cy="52" r="6"/>
      <circle cx="26" cy="20" r="3"/><circle cx="38" cy="20" r="3"/>
    </svg>
  ),
};

const getIcon = (icon: string) =>
  vehicleIcons[icon] || vehicleIcons['sedan'];

const comfortColors: Record<string, string> = {
  Basic: 'bg-gray-100 text-gray-600',
  Standard: 'bg-blue-50 text-blue-600',
  Comfortable: 'bg-green-50 text-green-700',
  Premium: 'bg-purple-50 text-purple-700',
  Luxury: 'bg-amber-50 text-amber-700',
};

interface VehicleCardProps {
  vehicle: Vehicle;
  selected: boolean;
  onSelect: (v: Vehicle) => void;
  couponDiscount?: number;
}

export default function VehicleCard({ vehicle, selected, onSelect, couponDiscount = 0 }: VehicleCardProps) {
  const discountedFare = Math.max(0, vehicle.fare - (selected ? couponDiscount : 0));

  return (
    <button
      onClick={() => onSelect(vehicle)}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border-2 transition-all duration-200 text-left
        ${selected
          ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
          : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'}`}
    >
      {/* Vehicle Icon */}
      <div className={`flex-shrink-0 p-2 rounded-xl ${selected ? 'text-blue-600' : 'text-gray-500'}`}>
        {getIcon(vehicle.icon)}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{vehicle.display_name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${comfortColors[vehicle.comfort] || comfortColors['Standard']}`}>
            {vehicle.comfort}
          </span>
          {vehicle.fare_breakdown.is_peak && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">Peak</span>
          )}
          {vehicle.fare_breakdown.surge_multiplier && vehicle.fare_breakdown.surge_multiplier > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium whitespace-nowrap">
              {vehicle.fare_breakdown.surge_multiplier}x surge
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>🕒 {vehicle.eta_display}</span>
          <span>👤 {vehicle.seats} seats</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{vehicle.cancellation_policy}</p>
      </div>

      {/* Fare */}
      <div className="flex-shrink-0 text-right">
        {couponDiscount > 0 && selected ? (
          <>
            <div className="text-xs line-through text-gray-400">₹{vehicle.fare.toFixed(0)}</div>
            <div className="text-lg font-bold text-green-600">₹{discountedFare.toFixed(0)}</div>
          </>
        ) : (
          <div className="text-lg font-bold text-gray-900">₹{vehicle.fare.toFixed(0)}</div>
        )}
        <div className="text-xs text-gray-400">estimated</div>
      </div>
    </button>
  );
}
