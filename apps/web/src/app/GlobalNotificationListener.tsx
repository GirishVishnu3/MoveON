'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store/index';
import { addNotification, NotificationItem } from 'shared/src/store/notificationSlice';

export default function GlobalNotificationListener() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const ws = useRef<WebSocket | null>(null);
  const [toast, setToast] = useState<NotificationItem | null>(null);

  useEffect(() => {
    if (!user) return;

    // Connect to global WebSocket based on role and user ID
    // Note: The previous websocket connections might conflict if they use the same URL without a multiplexer. 
    // Ideally, the whole app uses one WS connection. For now, we connect here.
    const rolePrefix = user.role.toLowerCase();
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'}/${rolePrefix}_${user.id}`;
    
    // We only connect if not already connected or if this is a specialized endpoint
    // To prevent duplicate connections on the same page, we could store WS in a global store,
    // but a listener here is standard for a simple app.
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'NOTIFICATION') {
          const notification = data.data as NotificationItem;
          dispatch(addNotification(notification));
          
          // Show toast
          setToast(notification);
          setTimeout(() => {
            setToast(null);
          }, 4000);
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user, dispatch]);

  if (!toast) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce">
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl p-4 w-72 border-l-4 border-blue-500">
        <div className="flex justify-between items-start">
          <p className="text-xs font-bold text-blue-500 uppercase">{toast.category.replace(/_/g, ' ')}</p>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        <p className="font-bold mt-1 text-sm">{toast.title}</p>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{toast.message}</p>
      </div>
    </div>
  );
}
