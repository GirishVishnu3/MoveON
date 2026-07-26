import React, { useEffect, useRef } from 'react';
import type { Vehicle } from '../../types/booking';

interface BookingConfirmationDialogProps {
  open: boolean;
  vehicle: Vehicle | null;
  totalFare: number;
  pickupAddress: string;
  destinationAddress: string;
  bookingRef: string | null;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

export default function BookingConfirmationDialog({
  open, vehicle, totalFare, pickupAddress, destinationAddress,
  bookingRef, onClose, onConfirm, isConfirming,
}: BookingConfirmationDialogProps) {
  if (!open) return null;

  // Searching for driver state
  if (bookingRef) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-white rounded-t-3xl px-6 py-8 shadow-2xl animate-slide-up">
          {/* Searching animation */}
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-blue-100 flex items-center justify-center">
                <span className="text-3xl">🚗</span>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Searching for drivers...</h2>
            <p className="text-gray-500 text-sm text-center">We are finding nearby drivers for you. This usually takes under a minute.</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Booking ID</span>
              <span className="font-bold text-gray-900">{bookingRef}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Vehicle</span>
              <span className="text-gray-700">{vehicle?.display_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Fare</span>
              <span className="font-semibold text-blue-600">₹{totalFare.toFixed(0)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors"
          >
            Cancel Booking
          </button>
        </div>
      </div>
    );
  }

  // Confirmation dialog
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-t-3xl px-6 py-8 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Confirm your ride</h2>
        <p className="text-gray-500 text-sm mb-5">Review your booking details before confirming.</p>

        <div className="flex flex-col gap-3 mb-6">
          <div className="flex items-start gap-2">
            <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
            <p className="text-sm text-gray-700">{pickupAddress}</p>
          </div>
          <div className="ml-1 border-l-2 border-dashed border-gray-200 h-3" />
          <div className="flex items-start gap-2">
            <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
            <p className="text-sm text-gray-700">{destinationAddress}</p>
          </div>

          <div className="flex items-center justify-between mt-2 bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="font-semibold text-gray-900">{vehicle?.display_name}</p>
              <p className="text-xs text-gray-500">{vehicle?.comfort} · {vehicle?.seats} seats</p>
            </div>
            <p className="text-xl font-bold text-blue-600">₹{totalFare.toFixed(0)}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50"
          >
            {isConfirming ? 'Confirming...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
