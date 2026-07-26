import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setPreferences } from '../../store/notificationSlice';
import { apiClient } from '../../api/axios';

const CATEGORIES = [
  'BOOKING_UPDATE', 'DRIVER_ASSIGNMENT', 'TRIP_PROGRESS', 
  'PAYMENT_EVENT', 'WALLET_EVENT', 'PROMOTIONAL', 'RATING_REVIEW'
];

export const NotificationSettings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { preferences } = useSelector((s: RootState) => s.notification);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrefs();
  }, []);

  const fetchPrefs = async () => {
    try {
      const res = await apiClient.get('/notifications/preferences');
      dispatch(setPreferences(res.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (category: string, field: 'push_enabled' | 'email_enabled' | 'sms_enabled' | 'in_app_enabled', currentValue: boolean) => {
    try {
      // Find current pref or default
      const currentPref = preferences.find(p => p.category === category) || {
        category, push_enabled: true, email_enabled: true, sms_enabled: true, in_app_enabled: true
      };

      const updatedPref = { ...currentPref, [field]: !currentValue };
      
      await apiClient.put('/notifications/preferences', updatedPref);
      
      // Update local state
      const newPrefs = preferences.filter(p => p.category !== category).concat(updatedPref);
      dispatch(setPreferences(newPrefs));
    } catch (err) {
      alert('Failed to update preference');
    }
  };

  if (loading) return <p className="text-gray-500">Loading preferences...</p>;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
      <h3 className="text-lg font-bold text-white mb-4">Notification Preferences</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead>
            <tr className="border-b border-white/10 uppercase text-xs text-gray-500">
              <th className="pb-3">Category</th>
              <th className="pb-3 text-center">Push</th>
              <th className="pb-3 text-center">SMS</th>
              <th className="pb-3 text-center">Email</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(cat => {
              const pref = preferences.find(p => p.category === cat) || {
                category: cat, push_enabled: true, email_enabled: true, sms_enabled: true
              };

              return (
                <tr key={cat} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="py-4 font-medium">{cat.replace(/_/g, ' ')}</td>
                  <td className="py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={pref.push_enabled} 
                      onChange={() => handleToggle(cat, 'push_enabled', pref.push_enabled)}
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={pref.sms_enabled} 
                      onChange={() => handleToggle(cat, 'sms_enabled', pref.sms_enabled)}
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={pref.email_enabled} 
                      onChange={() => handleToggle(cat, 'email_enabled', pref.email_enabled)}
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotificationSettings;
