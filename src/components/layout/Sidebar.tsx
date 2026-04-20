import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building2,
  HouseHeart,
  DoorClosed,
  Users,
  Bell,
  FileText,
  AlertTriangle,
  MessageSquare,
  Wrench,
  BarChart3,
  GraduationCap,
  Clock,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
  badgeKey?: string; // which badge count to show
}

const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: HouseHeart,
    path: '/dashboard',
    roles: ['system_admin', 'standard_user'],
    description: 'Return to the main dashboard and overview',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    path: '/payments',
    roles: ['system_admin', 'standard_user'],
    description: 'Capture payments, view payment history, manage outstanding payments',
    badgeKey: 'overdue',
  },
  {
    id: 'facilities',
    label: 'Facilities',
    icon: Building2,
    path: '/facilities',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage facilities, add rooms, view occupancy rates and facility status',
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: DoorClosed,
    path: '/rooms',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage individual rooms, view room status, occupancy details',
  },
  {
    id: 'renters',
    label: 'Renters',
    icon: Users,
    path: '/renters',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage tenants, store documents, track renter information',
  },
  {
    id: 'leases',
    label: 'Leases',
    icon: FileText,
    path: '/leases',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage lease agreements, view active contracts, track lease terms',
  },
  {
    id: 'payment-approvals',
    label: 'Payment Approvals',
    icon: Clock,
    path: '/payment-approvals',
    roles: ['system_admin'],
    description: 'Review and approve payment changes made by standard users',
    badgeKey: 'approvals',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    path: '/notifications',
    roles: ['system_admin', 'standard_user'],
    description: 'View and manage your notifications',
    badgeKey: 'notifications',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    path: '/maintenance',
    roles: ['system_admin', 'standard_user'],
    description: 'Track maintenance expenses, split costs across rooms, manage recovery',
  },
  {
    id: 'penalties',
    label: 'Penalties',
    icon: AlertTriangle,
    path: '/penalties',
    roles: ['system_admin', 'standard_user'],
    description: 'Manage late payment penalties, disputes, and penalty tracking',
  },
  {
    id: 'complaints',
    label: 'Complaints',
    icon: MessageSquare,
    path: '/complaints',
    roles: ['system_admin', 'standard_user'],
    description: 'Capture complaints, track resolution status, manage tenant issues',
    badgeKey: 'openComplaints',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
    roles: ['system_admin'],
    description: 'Monthly income, occupancy rates, overdue accounts, deposit liability',
  },
  {
    id: 'training',
    label: 'Training',
    icon: GraduationCap,
    path: '/training',
    roles: ['system_admin', 'standard_user'],
    description: 'Courses, certifications, and how-to reference guides for using RentDesk',
  },
];

interface Badges {
  approvals: number;
  overdue: number;
  openComplaints: number;
  notifications: number;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { currentRole, isSystemAdmin } = useRole();
  const { allowStandardUserFacilities, allowStandardUserRooms } = useSettings();
  const location = useLocation();
  const [badges, setBadges] = useState<Badges>({ approvals: 0, overdue: 0, openComplaints: 0, notifications: 0 });

  // Load badge counts
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          // Pending approvals
          isSystemAdmin
            ? getDocs(query(collection(db, 'payment_approvals'), where('status', '==', 'pending')))
            : Promise.resolve(null),
          // Open complaints
          getDocs(query(collection(db, 'complaints'), where('status', '==', 'open'))),
          // Overdue payments — count payment schedules with overdue months
          getDocs(query(collection(db, 'payment_schedules'))),
          // Unread notifications
          getDocs(query(collection(db, 'notifications'), where('read', '==', false))),
        ]);

        if (cancelled) return;

        const approvalsSnap = results[0].status === 'fulfilled' ? results[0].value : null;
        const complaintsSnap = results[1].status === 'fulfilled' ? results[1].value : null;
        const schedulesSnap = results[2].status === 'fulfilled' ? results[2].value : null;
        const notifSnap = results[3].status === 'fulfilled' ? results[3].value : null;

        let overdue = 0;
        schedulesSnap?.docs.forEach(d => {
          const data = d.data();
          if (Array.isArray(data.payments)) {
            overdue += data.payments.filter((p: any) => p.status === 'overdue').length;
          }
        });

        setBadges({
          approvals: approvalsSnap?.size ?? 0,
          overdue,
          openComplaints: complaintsSnap?.size ?? 0,
          notifications: notifSnap?.size ?? 0,
        });
      } catch {
        // silently fail — badges are non-critical
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isSystemAdmin, location.pathname]); // re-check whenever route changes

  const filteredMenuItems = menuItems.filter(item => {
    if (currentRole === 'system_admin') return true;
    if (currentRole === 'standard_user') {
      if (item.id === 'facilities') return allowStandardUserFacilities;
      if (item.id === 'rooms') return allowStandardUserRooms;
      return item.roles.includes('standard_user');
    }
    return item.roles.includes(currentRole);
  });

  const handleNavClick = () => {
    // Close sidebar on mobile after navigation
    const isMobile = window.innerWidth < 1024;
    if (isMobile && isOpen) onToggle();
  };

  const getBadgeCount = (key?: string): number => {
    if (!key) return 0;
    return (badges as any)[key] ?? 0;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-screen bg-gray-800 border-r border-gray-700 z-50 transition-all duration-300 ease-in-out flex flex-col
        ${isOpen ? 'w-72' : 'w-0'}
        lg:relative lg:z-auto lg:w-16
        ${isOpen ? 'lg:w-72' : 'lg:w-16'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          {isOpen ? (
            <div className="flex items-center gap-3">
              <img src="/RentDesk.png" alt="RentDesk" className="w-8 h-8 rounded-lg" />
              <span className="text-white font-semibold text-lg">RentDesk</span>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <img src="/RentDesk.png" alt="RentDesk" className="w-8 h-8 rounded-lg" />
            </div>
          )}
          <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0">
            {isOpen ? <ChevronLeft className="w-5 h-5 text-white" /> : <ChevronRight className="w-5 h-5 text-white" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-3 space-y-0.5">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const badgeCount = getBadgeCount(item.badgeKey);

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={handleNavClick}
                  title={!isOpen ? item.label : undefined}
                  className={`
                    relative flex items-center gap-3 rounded-lg transition-all duration-150
                    ${isOpen ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center'}
                    ${isActive
                      ? 'bg-yellow-500 text-gray-900'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <div className="relative flex-shrink-0">
                    <Icon className="w-5 h-5" />
                    {badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </div>
                  {isOpen && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {isOpen && badgeCount > 0 && (
                    <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full flex items-center justify-center">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="p-4 border-t border-gray-700 flex-shrink-0">
            <p className="text-xs text-gray-500 text-center">RentDesk v3.0</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
