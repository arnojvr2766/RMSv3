import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Building2, 
  HouseHeart, 
  DoorClosed,
  Users, 
  FileText,
  AlertTriangle, 
  MessageSquare, 
  Menu,
  X,
  Clock,
  Wrench
} from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { useSettings } from '../../contexts/SettingsContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  roles: string[];
  description: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: HouseHeart,
    path: '/',
    roles: ['system_admin', 'standard_user'],
    description: 'Return to the main dashboard and overview'
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    path: '/payments',
    roles: ['system_admin', 'standard_user'],
    description: 'Capture payments, view payment history, manage outstanding payments'
  },
  {
    id: 'facilities',
    label: 'Facilities',
    icon: Building2,
    path: '/facilities',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage facilities, add rooms, view occupancy rates and facility status'
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: DoorClosed,
    path: '/rooms',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage individual rooms, view room status, occupancy details'
  },
  {
    id: 'renters',
    label: 'Renters',
    icon: Users,
    path: '/renters',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage tenants, store documents, track renter information'
  },
  {
    id: 'leases',
    label: 'Leases',
    icon: FileText,
    path: '/leases',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage lease agreements, view active contracts, track lease terms'
  },
  {
    id: 'payment-approvals',
    label: 'Payment Approvals',
    icon: Clock,
    path: '/payment-approvals',
    roles: ['system_admin'],
    description: 'Review and approve payment changes made by standard users'
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    path: '/maintenance',
    roles: ['system_admin', 'standard_user'],
    description: 'Track maintenance expenses, split costs across rooms, manage recovery'
  },
  {
    id: 'penalties',
    label: 'Penalties',
    icon: AlertTriangle,
    path: '/penalties',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage late payment penalties, disputes, and penalty tracking'
  },
  {
    id: 'complaints',
    label: 'Complaints',
    icon: MessageSquare,
    path: '/complaints',
    roles: ['system_admin', 'standard_user'],
    description: 'Capture complaints, track resolution status, manage tenant issues'
  }
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { currentRole } = useRole();
  const { allowStandardUserFacilities, allowStandardUserRooms } = useSettings();
  const location = useLocation();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filteredMenuItems = menuItems.filter(item => {
    // System admin can access everything
    if (currentRole === 'system_admin') return true;
    
    // Standard user permissions based on settings
    if (currentRole === 'standard_user') {
      if (item.id === 'facilities') return allowStandardUserFacilities;
      if (item.id === 'rooms') return allowStandardUserRooms;
      // Other items are always available to standard users
      return true;
    }
    
    // Default role-based filtering
    return item.roles.includes(currentRole);
  });

  const handleItemClick = (itemId: string) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-gray-800 border-r border-gray-700 z-50 transition-all duration-300 ease-in-out
        ${isOpen ? 'w-80' : 'w-16'}
        lg:relative lg:z-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {isOpen && (
            <div className="flex items-center space-x-3">
              <img 
                src="/RentDesk.png" 
                alt="RentDesk Logo" 
                className="w-8 h-8 rounded-lg"
              />
              <div>
                <span className="text-white font-semibold text-lg">RentDesk</span>
              </div>
            </div>
          )}
          
          {!isOpen && (
            <div className="flex justify-center w-full">
              <img 
                src="/RentDesk.png" 
                alt="RentDesk Logo" 
                className="w-8 h-8 rounded-lg"
              />
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5 text-white" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isExpanded = expandedItem === item.id;
              
              return (
                <div key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      w-full flex items-center ${isOpen ? 'p-3' : 'p-2'} rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-primary-500 text-secondary-900' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`${isOpen ? 'w-5 h-5 mr-3' : 'w-14 h-14 mx-auto'}`} />
                    {isOpen && (
                      <>
                        <span className="font-medium">{item.label}</span>
                        <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </>
                    )}
                  </Link>
                  
                  {/* Expanded Description */}
                  {isOpen && isExpanded && (
                    <div className="mt-2 px-3 py-2 bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-300">{item.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="p-4 border-t border-gray-700">
            <div className="text-xs text-gray-400 text-center">
              <p>Rental Management System</p>
              <p>Version 3.0</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
