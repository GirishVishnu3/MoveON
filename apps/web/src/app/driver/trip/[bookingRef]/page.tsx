'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store/index';
import { apiClient } from 'shared/src/api/axios';
import {
  initializeTrip,
  updateTripStatus,
  updateDriverLocation,
  activateSOS,
} from 'shared/src/store/tripSlice';
import { socket } from 'shared/src/utils/websocket';
import { TripStatus } from 'shared/src/store/tripSlice';
import dynamic from 'next/dynamic';

const LiveRouteMap = dynamic(() => import('shared/src/components/location/LiveRouteMap'), { ssr: false });

export default function DriverTripPage() {
  const router = useRouter();
  const params = useParams();
  const bookingRef = params.bookingRef as string;
  const dispatch = useDispatch<AppDispatch>();

  const auth = useSelector((s: RootState) => s.auth);
  const trip = useSelector((s: RootState) => s.trip);

  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Mock driver GPS moving slightly
  const [currentLat, setCurrentLat] = useState(12.9716);
  const [currentLon, setCurrentLon] = useState(77.5946);

  useEffect(() => {
    fetchBooking();
    
    // Connect WS
    if (auth.user?.id) {
      socket.connect(`driver_${auth.user.id}`);
    }

    socket.on('TRIP_STATUS_UPDATED', handleStatusUpdate);
    socket.on('SOS_ACTIVATED', handleSOSUpdate);

    // Mock Location Ping every 5 seconds
    const interval = setInterval(() => {
      pushLocation();
    }, 5000);

    return () => {
      socket.off('TRIP_STATUS_UPDATED', handleStatusUpdate);
      socket.off('SOS_ACTIVATED', handleSOSUpdate);
      clearInterval(interval);
    };
  }, [bookingRef, auth.user?.id]);

  const fetchBooking = async () => {
    try {
      const res = await apiClient.get(`/booking/${bookingRef}`);
      setBookingDetails(res.data);
      dispatch(initializeTrip({ bookingRef, status: res.data.status }));
      setCurrentLat(res.data.pickup_lat);
      setCurrentLon(res.data.pickup_lon);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  const pushLocation = async () => {
    // move randomly a bit
    const newLat = currentLat + (Math.random() - 0.5) * 0.001;
    const newLon = currentLon + (Math.random() - 0.5) * 0.001;
    setCurrentLat(newLat);
    setCurrentLon(newLon);
    
    dispatch(updateDriverLocation({
      location: { lat: newLat, lon: newLon, timestamp: new Date().toISOString() }
    }));

    try {
      await apiClient.post(`/trip/${bookingRef}/location`, {
        latitude: newLat,
        longitude: newLon,
        speed: 30.5,
      });
    } catch {
      // ignore
    }
  };

  const handleStatusUpdate = (data: any) => {
    if (data.booking_ref === bookingRef) {
      dispatch(updateTripStatus({ status: data.status as TripStatus }));
    }
  };

  const handleSOSUpdate = (data: any) => {
    if (data.booking_ref === bookingRef) {
      dispatch(activateSOS());
    }
  };

  const updateStatus = async (newStatus: TripStatus) => {
    setActionLoading(true);
    try {
      await apiClient.post(`/trip/${bookingRef}/status`, { status: newStatus });
      dispatch(updateTripStatus({ status: newStatus }));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const completeTrip = async () => {
    setActionLoading(true);
    try {
      // Mock distances
      const actual_distance_km = bookingDetails.distance_km || 15.0;
      const actual_duration_min = bookingDetails.duration_min || 45.0;
      
      const res = await apiClient.post(`/trip/${bookingRef}/complete`, {
        actual_distance_km,
        actual_duration_min,
        toll_charges: 0.0,
        parking_charges: 0.0
      });
      
      alert(`Trip completed! Final Fare: ₹${res.data.final_fare.total_fare.toFixed(2)}`);
      router.push('/driver/home');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to complete trip');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading Trip Data...</div>;
  if (error) return <div className="p-8 text-red-400">{error}</div>;

  const st = trip.status;
  const isCompleted = st === 'COMPLETED' || st === 'CANCELLED';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="bg-slate-800 p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">Active Navigation</h1>
        <p className="text-gray-400 text-sm">Ref: {bookingRef}</p>
        {trip.sosActive && (
          <div className="mt-2 bg-red-600 text-white p-2 rounded text-sm font-bold text-center animate-pulse">
            🚨 SOS ACTIVATED 🚨
          </div>
        )}
      </div>

      <div className="flex-1 relative bg-slate-800/50 flex flex-col">
        {/* Live Map Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full h-[400px] bg-slate-700 rounded-3xl overflow-hidden relative shadow-inner">
             <LiveRouteMap
               pickup={{ lat: bookingDetails?.pickup_lat || 0, lon: bookingDetails?.pickup_lon || 0, address: bookingDetails?.pickup_address }}
               destination={{ lat: bookingDetails?.destination_lat || 0, lon: bookingDetails?.destination_lon || 0, address: bookingDetails?.destination_address }}
               driverLocation={{ lat: currentLat, lon: currentLon }}
               routeGeometry={bookingDetails?.route_geometry}
             />
          </div>
        </div>

        {/* Info Card */}
        <div className="p-4 bg-slate-800 rounded-t-3xl shadow-2xl flex flex-col gap-4 border-t border-slate-700">
           <div className="flex justify-between items-center">
             <div>
               <h3 className="text-gray-400 text-xs font-bold uppercase">Passenger</h3>
               <p className="text-lg font-bold">Passenger {bookingDetails?.rider_id.substring(0,6)}</p>
             </div>
             <div className="text-right">
               <h3 className="text-gray-400 text-xs font-bold uppercase">Status</h3>
               <p className="text-lg font-bold text-blue-400">{st?.replace(/_/g, ' ')}</p>
             </div>
           </div>

           <div className="h-px bg-slate-700" />
           
           <div className="flex flex-col gap-2 text-sm">
              <div className="flex gap-2 items-start">
                 <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
                 <span className="text-gray-300">{bookingDetails?.pickup_address}</span>
              </div>
              <div className="flex gap-2 items-start">
                 <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5" />
                 <span className="text-gray-300">{bookingDetails?.destination_address}</span>
              </div>
           </div>

           {/* Actions */}
           <div className="grid grid-cols-2 gap-3 mt-2">
             {!isCompleted && (
               <>
                 {(st === 'DRIVER_ASSIGNED' || st === 'DRIVER_EN_ROUTE') && (
                   <button 
                     disabled={actionLoading}
                     onClick={() => updateStatus('DRIVER_ARRIVED')}
                     className="col-span-2 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors"
                   >
                     Mark Arrived
                   </button>
                 )}
                 {st === 'DRIVER_ARRIVED' && (
                   <button 
                     disabled={actionLoading}
                     onClick={() => updateStatus('PASSENGER_ONBOARDED')}
                     className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition-colors"
                   >
                     Passenger Onboarded
                   </button>
                 )}
                 {st === 'PASSENGER_ONBOARDED' && (
                   <button 
                     disabled={actionLoading}
                     onClick={() => updateStatus('TRIP_STARTED')}
                     className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-colors"
                   >
                     Start Trip
                   </button>
                 )}
                 {st === 'TRIP_STARTED' && (
                   <button 
                     disabled={actionLoading}
                     onClick={() => updateStatus('TRIP_IN_PROGRESS')}
                     className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-colors"
                   >
                     En Route to Destination
                   </button>
                 )}
                 {st === 'TRIP_IN_PROGRESS' && (
                   <button 
                     disabled={actionLoading}
                     onClick={completeTrip}
                     className="col-span-2 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold shadow-lg shadow-green-900/50 transition-colors"
                   >
                     Complete Trip
                   </button>
                 )}
               </>
             )}
             
             {isCompleted && (
               <button 
                 onClick={() => router.push('/driver/home')}
                 className="col-span-2 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors"
               >
                 Back to Dashboard
               </button>
             )}
           </div>

           {/* Emergency */}
           {!isCompleted && (
             <button 
               onClick={() => updateStatus('SOS_ACTIVE')}
               className="w-full py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold mt-2"
             >
               Emergency SOS
             </button>
           )}
        </div>
      </div>
    </div>
  );
}
