import React, { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { useModal } from '../../../contexts/ModalContext';

interface MobileLayoutProps {
  children: ReactNode;
}

/**
 * MobileLayout provides the mobile-specific layout structure:
 * - Compact header at top
 * - Content area in middle
 * - Bottom navigation bar
 * - Hides navigation when modal is open
 */
const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isModalOpen } = useModal();

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col safe-area-top safe-area-bottom">
      {/* Mobile Header - Hidden when modal is open */}
      {!isModalOpen && <MobileHeader onMenuToggle={handleMenuToggle} />}

      {/* Content Area - Scrollable */}
      <main className={`flex-1 ${isModalOpen ? 'overflow-hidden' : 'overflow-y-auto'} ${isModalOpen ? '' : 'pb-20'} ${!isModalOpen ? 'pt-14' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation - Hidden when modal is open */}
      {!isModalOpen && <MobileBottomNav />}
    </div>
  );
};

export default MobileLayout;

