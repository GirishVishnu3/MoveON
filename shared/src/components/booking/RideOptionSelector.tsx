import React from 'react';
import type { TripType } from '../../types/booking';

interface RideOptionSelectorProps {
  selected: TripType;
  onChange: (t: TripType) => void;
}

const OPTIONS: { key: TripType; label: string; icon: string }[] = [
  { key: 'NOW', label: 'Ride Now', icon: '⚡' },
  { key: 'SCHEDULED', label: 'Schedule', icon: '🕒' },
  { key: 'ROUND_TRIP', label: 'Round Trip', icon: '🔄' },
];

export default function RideOptionSelector({ selected, onChange }: RideOptionSelectorProps) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            selected === opt.key
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
