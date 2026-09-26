"use client";
import React, { useState, useEffect, useRef } from 'react';
import { COUNTRIES, getCitiesForCountry, CountryCode, CityData } from '../../data/citiesData';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

interface CountryCitySelectorProps {
  selectedCountry: CountryCode;
  selectedCity: string;
  onCountryChange?: (country: CountryCode) => void;
  onCityChange: (city: CityData) => void;
}

export default function CountryCitySelector({
  selectedCountry,
  selectedCity,
  onCityChange,
}: CountryCitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<CityData[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const baseCities = getCitiesForCountry(selectedCountry);
  const currentCountry = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];
  const currentCity = baseCities.find(c => c.name.toLowerCase() === selectedCity.toLowerCase()) || {
    name: selectedCity,
    lat: 51.5074,
    lon: -0.1278,
    center: `${selectedCity}, ${currentCountry.name}`,
    viewbox: '',
    aliases: [selectedCity.toLowerCase()],
    countryCode: selectedCountry,
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter local cities by search query
  const filteredLocalCities = searchQuery.trim()
    ? baseCities.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.aliases.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : baseCities;

  // Search external cities via Nominatim API when user types
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearchingApi(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const countryCode = currentCountry.nominatimCountryCodes || 'gb';
        const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&countrycodes=${countryCode}&limit=6`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MoveON/1.0' } });
        const data = await res.json();

        const formattedResults: CityData[] = (data || []).map((item: any) => {
          const addr = item.address || {};
          const cityName = addr.city || addr.town || addr.village || addr.county || item.display_name.split(',')[0].trim();
          return {
            name: cityName,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            center: item.display_name,
            viewbox: '',
            aliases: [cityName.toLowerCase()],
            countryCode: selectedCountry,
          };
        });

        const unique = formattedResults.filter((item, index, self) => 
          index === self.findIndex((t) => t.name.toLowerCase() === item.name.toLowerCase())
        );

        setSearchResults(unique);
      } catch (e) {
        console.error('City search error:', e);
      } finally {
        setIsSearchingApi(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentCountry, selectedCountry]);

  const handleCitySelect = (city: CityData) => {
    onCityChange(city);
    setShowDropdown(false);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col gap-3 relative" ref={containerRef}>
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shadow-sm">
            <span className="text-2xl">{currentCountry.flag}</span>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Step 1: Select City ({currentCountry.name})</p>
            <p className="text-sm font-bold text-gray-900">
              Riding in {currentCity?.name || selectedCity}, {currentCountry.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100">
          <span>{currentCountry.currencyCode} ({currentCountry.currencySymbol})</span>
        </div>
      </div>

      {/* Direct City Search Input Bar */}
      <div className="relative">
        <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder={`Search & select any city in ${currentCountry.name} (e.g. Newcastle, Oxford, London)...`}
            value={searchQuery}
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            className="w-full text-xs font-semibold outline-none text-gray-900 placeholder-gray-400 bg-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowDropdown(false);
              }}
              className="text-gray-400 hover:text-gray-600 text-sm px-1 font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Live Search Autocomplete Dropdown */}
        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 overflow-hidden divide-y divide-gray-50 max-h-64 overflow-y-auto">
            <div className="px-3.5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/60 flex items-center justify-between">
              <span>{searchQuery ? `Matching Cities in ${currentCountry.name}` : `All Cities in ${currentCountry.name}`}</span>
              {isSearchingApi && <span className="animate-pulse text-blue-600 font-semibold">Searching...</span>}
            </div>

            {filteredLocalCities.map((city) => (
              <button
                key={city.name}
                onClick={() => handleCitySelect(city)}
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2.5 ${
                  selectedCity.toLowerCase() === city.name.toLowerCase()
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-gray-700 hover:bg-blue-50/50'
                }`}
              >
                <span className="text-base">{currentCountry.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 truncate">{city.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{city.center}</p>
                </div>
                {selectedCity.toLowerCase() === city.name.toLowerCase() && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-blue-600">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}

            {searchResults
              .filter(apiCity => !filteredLocalCities.some(l => l.name.toLowerCase() === apiCity.name.toLowerCase()))
              .map((city, idx) => (
                <button
                  key={`api-${idx}`}
                  onClick={() => handleCitySelect(city)}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors flex items-center gap-2.5 hover:bg-blue-50/50"
                >
                  <span className="text-base">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{city.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{city.center}</p>
                  </div>
                </button>
              ))}

            {filteredLocalCities.length === 0 && searchResults.length === 0 && !isSearchingApi && (
              <div className="p-4 text-center text-xs text-gray-400 font-medium">
                No cities found matching "{searchQuery}" in {currentCountry.name}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
