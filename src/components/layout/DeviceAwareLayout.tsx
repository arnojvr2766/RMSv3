import React, { ReactNode } from 'react';
import { useDevice } from '../../contexts/DeviceContext';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileLayout from './mobile/MobileLayout';

interface DeviceAwareLayoutProps {
  children: ReactNode;
  showDesktopLayout?: boolean; // Force desktop layout (for desktop routes)
}

/**
 * DeviceAwareLayout conditionally renders desktop or mobile layout
 * based on screen width (<480px = mobile, >=480px = desktop)
 */
const DeviceAwareLayout: React.FC<DeviceAwareLayoutProps> = ({ 
  children, 
  showDesktopLayout = false 
}) => {
  const { isMobile } = useDevice();

  // If explicitly showing desktop layout OR not mobile, use desktop layout
  if (showDesktopLayout || !isMobile) {
    // Desktop layout: Header + Sidebar + content (existing layout)
    return (
      <div className="min-h-screen bg-gray-900">
        {children}
      </div>
    );
  }

  // Mobile layout: MobileHeader + BottomNav + content
  return <MobileLayout>{children}</MobileLayout>;
};

export default DeviceAwareLayout;

