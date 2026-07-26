import React from 'react';

interface RideSchedulerProps {
  tripType: 'SCHEDULED' | 'ROUND_TRIP';
  scheduledAt: string | null;
  returnAt: string | null;
  onScheduledAtChange: (val: string | null) => void;
  onReturnAtChange: (val: string | null) => void;
}

function toLocalDatetimeString(isoString: string | null): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getMinDatetime(): string {
  const d = new Date(Date.now() + 15 * 60 * 1000); // 15 mins from now
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getMaxDatetime(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:00`;
}

export default function RideScheduler({
  tripType, scheduledAt, returnAt, onScheduledAtChange, onReturnAtChange,
}: RideSchedulerProps) {
  const min = getMinDatetime();
  const max = getMaxDatetime();

  return (
    <div className="flex flex-col gap-3 bg-blue-50 rounded-2xl p-4 border border-blue-100">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-blue-800">
          {tripType === 'ROUND_TRIP' ? '🚗 Departure Date & Time' : '🕒 Scheduled Pickup Time'}
        </label>
        <input
          type="datetime-local"
          min={min}
          max={max}
          value={toLocalDatetimeString(scheduledAt)}
          onChange={e => onScheduledAtChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          className="border border-blue-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {tripType === 'ROUND_TRIP' && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-blue-800">🔄 Return Date & Time</label>
          <input
            type="datetime-local"
            min={scheduledAt ? toLocalDatetimeString(scheduledAt) : min}
            max={max}
            value={toLocalDatetimeString(returnAt)}
            onChange={e => onReturnAtChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
            className="border border-blue-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <p className="text-xs text-blue-500">
        Rides can be scheduled up to 7 days in advance between 5:00 AM and 11:00 PM.
      </p>
    </div>
  );
}
