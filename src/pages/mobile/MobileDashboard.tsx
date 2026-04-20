import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, DoorClosed, ClipboardCheck, Users, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import MobileCard from '../../components/mobile/MobileCard';
import Button from '../../components/ui/Button';

/**
 * MobileDashboard - Landing page for mobile users
 * Shows quick access to main features
 */
const MobileDashboard: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      path: '/mobile/payments',
      color: 'bg-green-500/20 text-green-400',
    },
    {
      id: 'rooms',
      label: 'Rooms',
      icon: DoorClosed,
      path: '/mobile/rooms',
      color: 'bg-blue-500/20 text-blue-400',
    },
    {
      id: 'inspections',
      label: 'Inspections',
      icon: ClipboardCheck,
      path: '/mobile/inspections',
      color: 'bg-purple-500/20 text-purple-400',
    },
    {
      id: 'renters',
      label: 'Renters',
      icon: Users,
      path: '/mobile/renters',
      color: 'bg-orange-500/20 text-orange-400',
    },
    {
      id: 'leases',
      label: 'Leases',
      icon: FileText,
      path: '/mobile/leases',
      color: 'bg-yellow-500/20 text-yellow-400',
    },
  ];

  return (
    <div className="p-4 pt-20 pb-24 space-y-6">
      {/* Welcome Section */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-gray-400">Quick access to your tools</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <MobileCard
              key={action.id}
              onClick={() => navigate(action.path)}
              className="cursor-pointer hover:bg-gray-700/50 active:bg-gray-700 transition-colors"
            >
              <div className="flex flex-col items-center justify-center space-y-3 py-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${action.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-white font-medium text-sm text-center">{action.label}</span>
              </div>
            </MobileCard>
          );
        })}
      </div>

      {/* Quick Stats (Optional - can be enhanced later) */}
      <MobileCard className="bg-gradient-to-r from-primary-500/10 to-primary-600/10 border-primary-500/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Quick Stats</p>
            <p className="text-white font-semibold">Coming Soon</p>
          </div>
          <TrendingUp className="w-8 h-8 text-primary-500" />
        </div>
      </MobileCard>

      {/* Info Banner */}
      <MobileCard className="bg-blue-500/10 border-blue-500/30">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-white font-medium text-sm mb-1">Mobile App</p>
            <p className="text-gray-400 text-xs">
              Use the bottom navigation to quickly access Payments, Rooms, Inspections, Renters, and Leases.
            </p>
          </div>
        </div>
      </MobileCard>
    </div>
  );
};

export default MobileDashboard;

