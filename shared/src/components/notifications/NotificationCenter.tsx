import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setNotifications, markAsRead, markAllAsRead, setLoading } from '../../store/notificationSlice';
import { apiClient } from '../../api/axios';

interface NotificationCenterProps {
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((s: RootState) => s.notification);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    dispatch(setLoading(true));
    try {
      const res = await apiClient.get('/notifications');
      dispatch(setNotifications(res.data));
    } catch (err: any) {
      setError('Failed to load notifications');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      dispatch(markAsRead(id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      dispatch(markAllAsRead());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="absolute right-0 top-12 w-80 max-h-[500px] overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800 rounded-t-2xl sticky top-0">
        <h3 className="font-bold text-white">Notifications</h3>
        <div className="flex gap-3">
          <button onClick={handleMarkAllAsRead} className="text-xs text-blue-400 hover:text-blue-300 font-bold">
            Read All
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
      </div>

      <div className="p-2 flex flex-col gap-1">
        {isLoading && <p className="text-center text-gray-500 py-6 text-sm">Loading...</p>}
        {error && <p className="text-center text-red-400 py-6 text-sm">{error}</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-center text-gray-500 py-8 text-sm">No notifications</p>
        )}
        
        {items.map(item => (
          <div 
            key={item.id} 
            className={`p-3 rounded-xl border transition-colors ${
              item.is_read 
                ? 'bg-transparent border-transparent' 
                : 'bg-blue-500/10 border-blue-500/20'
            } hover:bg-white/5 cursor-pointer`}
            onClick={() => !item.is_read && handleMarkAsRead(item.id)}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                {item.category.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-gray-500">
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className={`text-sm ${item.is_read ? 'text-gray-300' : 'text-white font-bold'}`}>
              {item.title}
            </p>
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {item.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationCenter;
