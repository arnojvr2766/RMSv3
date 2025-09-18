import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
