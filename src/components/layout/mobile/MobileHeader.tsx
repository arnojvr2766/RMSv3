import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, Menu, X, ArrowLeft, User, Settings, LogOut } from 'lucide-react';
import NotificationBell from '../../notifications/NotificationBell';
import Button from '../../ui/Button';
import { useAuth } from '../../../contexts/AuthContext';
import { useRole } from '../../../contexts/RoleContext';

interface MobileHeaderProps {
  onMenuToggle: () => void;
}

/**
 * MobileHeader - Compact header for mobile view
 * Shows: Logo, Search, Notifications, User menu
 * Includes back button when on detail pages
 */
const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuToggle }) => {
  const { user, signOut } = useAuth();
  const { currentRole } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Determine if we're on a detail page (show back button)
  const isDetailPage = location.pathname.includes('/mobile/') && 
    !['/mobile/payments', '/mobile/rooms', '/mobile/inspections', '/mobile/renters', '/mobile/leases'].includes(location.pathname);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700 safe-area-top">
        <div className="flex items-center justify-between h-14 px-3">
          {/* Left: Back button or Logo */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            {isDetailPage ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <Link to="/mobile/dashboard" className="flex items-center space-x-2 min-w-0">
                <img 
                  src="/RentDesk.png" 
                  alt="RentDesk Logo" 
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                />
                <span className="text-white font-bold text-sm truncate">RentDesk</span>
              </Link>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-1">
            {/* Search Button - TODO: Implement GlobalSearch component */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: Implement global search modal
                console.log('Search clicked');
              }}
              className="p-2"
            >
              <Search className="w-5 h-5" />
            </Button>

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="p-2"
              >
                <User className="w-5 h-5" />
              </Button>

              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-gray-700">
                      <p className="text-white text-sm font-medium truncate">{user?.email}</p>
                      <p className="text-gray-400 text-xs capitalize">{currentRole}</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => {
                          navigate('/mobile/settings');
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-left text-white hover:bg-gray-700 rounded"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">Settings</span>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-left text-red-400 hover:bg-gray-700 rounded"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;

