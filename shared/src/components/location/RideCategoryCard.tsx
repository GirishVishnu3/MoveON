import React from 'react';

interface RideCategoryCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export default function RideCategoryCard({ title, description, icon, onClick }: RideCategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-6 bg-white border-2 border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all duration-300 group cursor-pointer"
    >
      <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 mb-4">
        {icon}
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
        {title}
      </h2>
      <p className="text-sm text-gray-500 text-center">
        {description}
      </p>
    </button>
  );
}
