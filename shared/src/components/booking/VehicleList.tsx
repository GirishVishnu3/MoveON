import React, { useState } from 'react';
import type { Vehicle } from '../../types/booking';
import VehicleCard from './VehicleCard';

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedCategory: string | null;
  onSelect: (v: Vehicle) => void;
  couponDiscount?: number;
  isLoading?: boolean;
}

type SortKey = 'eta' | 'price_asc' | 'price_desc' | 'comfort';

const comfortRank: Record<string, number> = {
  Basic: 1, Standard: 2, Comfortable: 3, Premium: 4, Luxury: 5,
};

export default function VehicleList({
  vehicles, selectedCategory, onSelect, couponDiscount = 0, isLoading = false,
}: VehicleListProps) {
  const [sort, setSort] = useState<SortKey>('eta');
  const [filterComfort, setFilterComfort] = useState<string>('All');

  const sorted = [...vehicles]
    .filter(v => filterComfort === 'All' || v.comfort === filterComfort)
    .sort((a, b) => {
      if (sort === 'eta') return a.eta_min - b.eta_min;
      if (sort === 'price_asc') return a.fare - b.fare;
      if (sort === 'price_desc') return b.fare - a.fare;
      if (sort === 'comfort') return (comfortRank[b.comfort] || 0) - (comfortRank[a.comfort] || 0);
      return 0;
    });

  const comfortOptions = ['All', ...Array.from(new Set(vehicles.map(v => v.comfort)))];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-500 mr-1">Sort:</span>
        {(['eta', 'price_asc', 'price_desc', 'comfort'] as SortKey[]).map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              sort === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s === 'eta' ? 'Fastest' : s === 'price_asc' ? 'Cheapest' : s === 'price_desc' ? 'Premium' : 'Comfort'}
          </button>
        ))}
        <span className="text-xs font-medium text-gray-500 ml-2 mr-1">Filter:</span>
        {comfortOptions.map(c => (
          <button
            key={c}
            onClick={() => setFilterComfort(c)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filterComfort === c ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Vehicle Cards */}
      {sorted.length === 0 ? (
        <p className="text-center text-gray-400 py-6">No vehicles available for the selected filter.</p>
      ) : (
        sorted.map(v => (
          <VehicleCard
            key={v.category}
            vehicle={v}
            selected={selectedCategory === v.category}
            onSelect={onSelect}
            couponDiscount={couponDiscount}
          />
        ))
      )}
    </div>
  );
}
