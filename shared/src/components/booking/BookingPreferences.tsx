import React, { useState } from 'react';
import type { BookingPreferences } from '../../types/booking';

interface BookingPreferencesProps {
  preferences: BookingPreferences;
  onChange: (prefs: Partial<BookingPreferences>) => void;
}

interface ToggleItem {
  key: keyof BookingPreferences;
  label: string;
  icon: string;
  type: 'boolean';
}

const TOGGLES: ToggleItem[] = [
  { key: 'air_conditioning', label: 'Air Conditioning', icon: '❄️', type: 'boolean' },
  { key: 'pet_friendly', label: 'Pet Friendly', icon: '🐾', type: 'boolean' },
  { key: 'wheelchair_accessible', label: 'Wheelchair Accessible', icon: '♿', type: 'boolean' },
  { key: 'female_driver_preferred', label: 'Female Driver', icon: '👩', type: 'boolean' },
  { key: 'child_seat', label: 'Child Seat', icon: '👶', type: 'boolean' },
  { key: 'silent_ride', label: 'Silent Ride', icon: '🤫', type: 'boolean' },
];

export default function BookingPreferencesPanel({ preferences, onChange }: BookingPreferencesProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="font-semibold text-gray-800">Ride Preferences</span>
        <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-100 pt-3">
          {/* Boolean toggles */}
          <div className="grid grid-cols-2 gap-2">
            {TOGGLES.map(toggle => (
              <button
                key={toggle.key}
                onClick={() => onChange({ [toggle.key]: !preferences[toggle.key] })}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  preferences[toggle.key]
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <span>{toggle.icon}</span>
                <span>{toggle.label}</span>
              </button>
            ))}
          </div>

          {/* Language */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 min-w-[80px]">Language</label>
            <select
              value={preferences.preferred_language}
              onChange={e => onChange({ preferred_language: e.target.value })}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="kn">Kannada</option>
              <option value="ml">Malayalam</option>
            </select>
          </div>

          {/* Music */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 min-w-[80px]">Music</label>
            <select
              value={preferences.music_preference || ''}
              onChange={e => onChange({ music_preference: e.target.value || null })}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">No preference</option>
              <option value="bollywood">Bollywood</option>
              <option value="pop">Pop</option>
              <option value="classical">Classical</option>
              <option value="no_music">No Music</option>
            </select>
          </div>

          {/* Special Instructions */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600">Special Instructions</label>
            <textarea
              value={preferences.special_instructions || ''}
              onChange={e => onChange({ special_instructions: e.target.value || null })}
              placeholder="Any note for the driver..."
              rows={2}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
