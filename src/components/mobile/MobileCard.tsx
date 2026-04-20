import React, { ReactNode } from 'react';
import Card from '../ui/Card';

interface MobileCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  swipeable?: boolean;
}

/**
 * MobileCard - Reusable card component optimized for mobile
 * Features:
 * - Large touch targets (min 48px height)
 * - Optimized spacing
 * - Swipe actions support (optional)
 * - Tap to interact
 */
const MobileCard: React.FC<MobileCardProps> = ({
  children,
  onClick,
  className = '',
  swipeable = false,
}) => {
  return (
    <Card
      className={`
        ${onClick ? 'cursor-pointer hover:bg-gray-700/50 active:bg-gray-700 transition-colors' : ''}
        ${swipeable ? 'touch-pan-y' : ''}
        min-h-[48px] p-4
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </Card>
  );
};

export default MobileCard;

