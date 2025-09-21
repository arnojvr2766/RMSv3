import React from 'react';
import { 
  CreditCard, 
  Users, 
  Building, 
  FileText, 
  Settings, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Plus,
  TrendingUp,
  Shield,
  Database
} from 'lucide-react';
import Button from '../ui/Button';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
}

interface QuickActionsProps {
  onActionClick: (action: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const actions: QuickAction[] = [
    {
      id: 'payment',
      title: 'Capture Payment',
      description: 'Record new rent payment',
      icon: CreditCard,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      onClick: () => onActionClick('payment')
    },
    {
      id: 'tenant',
      title: 'Add Tenant',
      description: 'Register new tenant',
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      onClick: () => onActionClick('tenant')
    },
    {
      id: 'room',
      title: 'Add Room',
      description: 'Create new room listing',
      icon: Building,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      onClick: () => onActionClick('room')
    },
    {
      id: 'lease',
      title: 'New Lease',
      description: 'Create lease agreement',
      icon: FileText,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      onClick: () => onActionClick('lease')
    },
    {
      id: 'reports',
      title: 'Generate Report',
      description: 'View financial reports',
      icon: BarChart3,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      onClick: () => onActionClick('reports')
    },
    {
      id: 'overdue',
      title: 'Overdue Payments',
      description: 'Manage overdue accounts',
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      onClick: () => onActionClick('overdue'),
      badge: '3',
      badgeColor: 'bg-red-500'
    },
    {
      id: 'approvals',
      title: 'Pending Approvals',
      description: 'Review pending items',
      icon: CheckCircle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      onClick: () => onActionClick('approvals'),
      badge: '7',
      badgeColor: 'bg-yellow-500'
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure system settings',
      icon: Settings,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      onClick: () => onActionClick('settings')
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View performance metrics',
      icon: TrendingUp,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/20',
      onClick: () => onActionClick('analytics')
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Manage user access',
      icon: Shield,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      onClick: () => onActionClick('security')
    },
    {
      id: 'backup',
      title: 'Data Backup',
      description: 'Manage data backups',
      icon: Database,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/20',
      onClick: () => onActionClick('backup')
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      description: 'Schedule maintenance',
      icon: Plus,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      onClick: () => onActionClick('maintenance')
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
        <div className="text-sm text-gray-400">
          {actions.length} actions available
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {actions.map((action) => {
          const IconComponent = action.icon;
          return (
            <div
              key={action.id}
              className="group relative bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer"
              onClick={action.onClick}
            >
              {action.badge && (
                <div className={`absolute -top-2 -right-2 w-6 h-6 ${action.badgeColor} rounded-full flex items-center justify-center text-xs font-bold text-white`}>
                  {action.badge}
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                  <IconComponent className={`w-5 h-5 ${action.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white group-hover:text-gray-200 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Click to {action.title.toLowerCase()}
                </div>
                <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                  →
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
