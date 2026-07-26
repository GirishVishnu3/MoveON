import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import NotificationCenter from './NotificationCenter';
import { FaBell } from 'react-icons/fa';

export const NotificationBadge = () => {
  const { unreadCount } = useSelector((state: RootState) => state.notification);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
      >
        <FaBell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-[10px] font-bold text-white flex items-center justify-center rounded-full border-2 border-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationCenter onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default NotificationBadge;
