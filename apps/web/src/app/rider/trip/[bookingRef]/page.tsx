'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store/index';
import { apiClient } from 'shared/src/api/axios';
import {
  initializeTrip,
  updateTripStatus,
  updateDriverLocation,
  activateSOS,
  setFinalFare,
} from 'shared/src/store/tripSlice';
import { socket } from 'shared/src/utils/websocket';
import { TripStatus } from 'shared/src/store/tripSlice';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const LiveRouteMap = dynamic(() => import('shared/src/components/location/LiveRouteMap'), { ssr: false });

export default function RiderTripPage() {
  const router = useRouter();
  const params = useParams();
  const bookingRef = params.bookingRef as string;
  const dispatch = useDispatch<AppDispatch>();

  const trip = useSelector((s: RootState) => s.trip);

  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBooking();
    
    // Connect WS
    socket.connect(`rider_${bookingRef}`);

    socket.on('TRIP_STATUS_UPDATED', handleStatusUpdate);
    socket.on('DRIVER_LOCATION_UPDATE', handleLocationUpdate);
    socket.on('SOS_ACTIVATED', handleSOSUpdate);
    socket.on('TRIP_COMPLETED', handleTripCompleted);

    return () => {
      socket.off('TRIP_STATUS_UPDATED', handleStatusUpdate);
      socket.off('DRIVER_LOCATION_UPDATE', handleLocationUpdate);
      socket.off('SOS_ACTIVATED', handleSOSUpdate);
      socket.off('TRIP_COMPLETED', handleTripCompleted);
    };
  }, [bookingRef]);

  const fetchBooking = async () => {
    try {
      const res = await apiClient.get(`/booking/${bookingRef}`);
      setBookingDetails(res.data);
      dispatch(initializeTrip({ bookingRef, status: res.data.status }));
      if (res.data.final_fare) {
        dispatch(setFinalFare(res.data.final_fare));
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (data: any) => {
    if (data.booking_ref === bookingRef) {
      dispatch(updateTripStatus({ status: data.status as TripStatus }));
    }
  };

  const handleLocationUpdate = (data: any) => {
    if (data.booking_ref === bookingRef) {
      dispatch(updateDriverLocation({
        location: { lat: data.lat, lon: data.lon, timestamp: new Date().toISOString() },
        etaMinutes: data.eta_minutes
      }));
    }
  };

  const handleSOSUpdate = (data: any) => {
    if (data.booking_ref === bookingRef) {
      dispatch(activateSOS());
    }
  };

  const handleTripCompleted = (data: any) => {
    if (data.booking_ref === bookingRef) {
      dispatch(setFinalFare(data.final_fare));
    }
  };

  const activateRiderSOS = async () => {
    try {
      await apiClient.post(`/trip/${bookingRef}/sos`);
      dispatch(activateSOS());
    } catch (err: any) {
      alert(err.response?.data?.detail || 'SOS failed');
    }
  };

  if (loading) return <div className="p-8 text-white">Loading Trip Data...</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;

  const st = trip.status;
  const isCompleted = st === 'COMPLETED' || st === 'CANCELLED';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
        <div>
           <h1 className="text-lg font-bold">Live Trip</h1>
           <p className="text-gray-400 text-xs">Ref: {bookingRef}</p>
        </div>
        <Link href="/rider/home" className="text-blue-400 text-sm font-bold">Home</Link>
      </div>

      {trip.sosActive && (
        <div className="bg-red-600 text-white p-3 text-center font-bold animate-pulse">
          🚨 SOS ACTIVATED. AUTHORITIES NOTIFIED. 🚨
        </div>
      )}

      <div className="flex-1 relative flex flex-col">
        {/* Live Map */}
        <div className="flex-1 relative overflow-hidden">
           <LiveRouteMap
             pickup={{ lat: bookingDetails?.pickup_lat || 0, lon: bookingDetails?.pickup_lon || 0, address: bookingDetails?.pickup_address }}
             destination={{ lat: bookingDetails?.destination_lat || 0, lon: bookingDetails?.destination_lon || 0, address: bookingDetails?.destination_address }}
             driverLocation={trip.driverLocation ? { lat: trip.driverLocation.lat, lon: trip.driverLocation.lon } : null}
             routeGeometry={bookingDetails?.route_geometry}
           />
        </div>

        {/* Status Bottom Sheet */}
        <div className="bg-white rounded-t-3xl p-6 text-slate-900 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-20">
           <div className="flex justify-between items-end mb-4">
              <div>
                 <h2 className="text-2xl font-black text-blue-600">
                   {st?.replace(/_/g, ' ')}
                 </h2>
                 {!isCompleted && trip.etaMinutes !== null && (
                   <p className="text-sm font-bold text-gray-500">
                     Driver is ~{trip.etaMinutes} mins away
                   </p>
                 )}
              </div>
              
              {isCompleted && trip.finalFare && (
                 <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Final Fare</p>
                    <p className="text-2xl font-black text-green-600">₹{trip.finalFare.toFixed(2)}</p>
                 </div>
              )}
           </div>

           <div className="h-px bg-gray-100 mb-4" />

           {/* Locations */}
           <div className="flex flex-col gap-3 text-sm font-medium text-gray-600 mb-6">
              <div className="flex items-start gap-3">
                 <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                 <p>{bookingDetails?.pickup_address}</p>
              </div>
              <div className="flex items-start gap-3">
                 <div className="w-3 h-3 rounded-full bg-red-500 mt-1" />
                 <p>{bookingDetails?.destination_address}</p>
              </div>
           </div>

           {/* Actions */}
           {!isCompleted && (
             <div className="grid grid-cols-2 gap-3">
               <button className="py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors">
                 Share Trip
               </button>
               <button 
                 onClick={activateRiderSOS}
                 className="py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold transition-colors"
               >
                 SOS
               </button>
             </div>
           )}

           {isCompleted && (
             <button 
               onClick={() => router.push('/rider/home')}
               className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-blue-900/20 transition-colors"
             >
               Done
             </button>
           )}
        </div>
      </div>
    </div>
  );
}
