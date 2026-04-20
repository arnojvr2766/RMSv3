import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HouseHeart, CreditCard, Users, FileText, MessageSquare } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', icon: HouseHeart, label: 'Home' },
  { path: '/payments',  icon: CreditCard,  label: 'Payments' },
  { path: '/renters',   icon: Users,        label: 'Renters' },
  { path: '/leases',    icon: FileText,     label: 'Leases' },
  { path: '/complaints',icon: MessageSquare,label: 'Issues' },
];

const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gray-800 border-t border-gray-700 lg:hidden safe-area-pb">
      <div className="flex items-stretch">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors min-h-[56px] ${
                isActive ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && <span className="absolute bottom-0 w-10 h-0.5 bg-yellow-400 rounded-t-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
