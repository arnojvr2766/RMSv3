import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, DoorClosed, ClipboardCheck, Users, FileText } from 'lucide-react';
import { useRole } from '../../../contexts/RoleContext';
import { notificationService } from '../../../services/notificationService';
import { useAuth } from '../../../contexts/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

/**
 * MobileBottomNav - Fixed bottom navigation bar for mobile
 * Shows 5 main tabs: Payments, Rooms, Inspections, Renters, Leases
 */
const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentRole } = useRole();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = notificationService.subscribeToUnreadCount(
      user.uid,
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const navItems: NavItem[] = [
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      path: '/mobile/payments',
    },
    {
      id: 'rooms',
      label: 'Rooms',
      icon: DoorClosed,
      path: '/mobile/rooms',
    },
    {
      id: 'inspections',
      label: 'Inspections',
      icon: ClipboardCheck,
      path: '/mobile/inspections',
    },
    {
      id: 'renters',
      label: 'Renters',
      icon: Users,
      path: '/mobile/renters',
    },
    {
      id: 'leases',
      label: 'Leases',
      icon: FileText,
      path: '/mobile/leases',
    },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 border-t border-gray-700 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] px-2 py-1 rounded-lg transition-colors ${
                active
                  ? 'text-primary-500 bg-primary-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">{item.badge > 9 ? '9+' : item.badge}</span>
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 ${active ? 'font-semibold' : 'font-normal'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;

