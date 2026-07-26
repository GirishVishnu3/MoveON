import React from 'react';
import { twMerge } from 'tailwind-merge';

interface PhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  error?: string;
  className?: string;
}

const COUNTRY_CODES = [
  { code: '+91', country: 'IN' },
  { code: '+1', country: 'US/CA' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'AU' },
];

export function PhoneInput({ 
  countryCode, 
  phoneNumber, 
  onCountryCodeChange, 
  onPhoneNumberChange, 
  error,
  className 
}: PhoneInputProps) {
  
  return (
    <div className={twMerge('flex flex-col w-full', className)}>
      <div className={twMerge(
        'flex border rounded-2xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 overflow-hidden bg-gray-950/80 transition-all',
        error ? 'border-red-500' : 'border-gray-800'
      )}>
        <select
          value={countryCode}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          className="bg-gray-900 border-r border-gray-800 px-3.5 py-4 outline-none text-white text-sm font-semibold cursor-pointer hover:bg-gray-850 transition-colors"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code} className="bg-gray-900 text-white">
              {c.code} {c.country}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, ''))}
          placeholder="Mobile Number"
          className="flex-1 px-4 py-4 outline-none text-white text-sm font-semibold bg-transparent placeholder-gray-500 w-full"
        />
      </div>
      {error && <span className="text-red-400 text-xs font-semibold mt-1.5 pl-1">{error}</span>}
    </div>
  );
}
