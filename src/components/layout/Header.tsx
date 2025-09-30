import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings, LogOut, Menu, Database, User, Wifi, WifiOff } from 'lucide-react';
import Button from '../ui/Button';
import { useRole } from '../../contexts/RoleContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import DataManagement from '../forms/DataManagement';

interface HeaderProps {
  onMenuToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { currentRole, isSystemAdmin } = useRole();
  const { user, signOut } = useAuth();
  const { isOffline } = useSettings();
  const [showDataManagement, setShowDataManagement] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="w-full px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
                 {/* Mobile Menu Button */}
                 <div className="flex items-center space-x-3">
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={onMenuToggle}
                     className="lg:hidden"
                   >
                     <Menu className="w-5 h-5" />
                   </Button>

                   {/* Logo and Title */}
                   <Link to="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
                     <img 
                       src="/RentDesk.png" 
                       alt="RentDesk Logo" 
                       className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg"
                     />
                     <div className="hidden sm:block">
                       <h1 className="text-lg sm:text-xl font-bold text-white">
                         RentDesk
                       </h1>
                       <p className="text-xs text-gray-400">
                         Version 1.0.0
                       </p>
                     </div>
                   </Link>
                 </div>

          {/* User Role Indicator - Hidden on mobile */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-gray-700 rounded-full">
            <span className="text-xs text-gray-400">
              Role:
            </span>
            <span className={`text-xs font-semibold ${
              isSystemAdmin 
                ? 'text-yellow-400' 
                : 'text-blue-400'
            }`}>
              {currentRole === 'system_admin' ? 'System Admin' : 'Standard User'}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {isSystemAdmin && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDataManagement(true)}
                title="Data Management"
              >
                <Database className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" title="Notifications">
              <Bell className="w-4 h-4" />
            </Button>
            
            {/* Connection Status - Hidden on mobile */}
            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 bg-gray-700 rounded-full">
              {isOffline ? (
                <>
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400">Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">Online</span>
                </>
              )}
            </div>
            
            <Link to="/settings">
              <Button variant="ghost" size="sm" title="Settings">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
            
            {/* User Info - Simplified on mobile */}
            <div className="flex items-center space-x-2 px-2 sm:px-3 py-1 bg-gray-700 rounded-full">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="User Avatar" 
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                />
              ) : (
                <User className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-xs text-gray-300 max-w-20 sm:max-w-32 truncate hidden sm:block">
                {user?.displayName || user?.email}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Data Management Modal */}
      {showDataManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <DataManagement
              onClose={() => setShowDataManagement(false)}
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
