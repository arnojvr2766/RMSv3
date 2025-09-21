import React from 'react';
import { 
  CreditCard, 
  Users, 
  Building, 
  FileText, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  UserPlus,
  Home,
  AlertCircle
} from 'lucide-react';
import Card from '../ui/Card';

interface Activity {
  id: string;
  type: 'payment' | 'lease' | 'tenant' | 'maintenance' | 'overdue' | 'approval' | 'system';
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
  status?: 'success' | 'warning' | 'error' | 'info';
  metadata?: any;
}

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, maxItems = 10 }) => {
  const getActivityIcon = (type: string, status?: string) => {
    const iconProps = { className: "w-4 h-4" };
    
    switch (type) {
      case 'payment':
        return <CreditCard {...iconProps} />;
      case 'lease':
        return <FileText {...iconProps} />;
      case 'tenant':
        return <Users {...iconProps} />;
      case 'maintenance':
        return <Building {...iconProps} />;
      case 'overdue':
        return <AlertTriangle {...iconProps} />;
      case 'approval':
        return <CheckCircle {...iconProps} />;
      case 'system':
        return <TrendingUp {...iconProps} />;
      default:
        return <AlertCircle {...iconProps} />;
    }
  };

  const getActivityColor = (type: string, status?: string) => {
    switch (type) {
      case 'payment':
        return 'text-green-400 bg-green-500/20';
      case 'lease':
        return 'text-blue-400 bg-blue-500/20';
      case 'tenant':
        return 'text-purple-400 bg-purple-500/20';
      case 'maintenance':
        return 'text-orange-400 bg-orange-500/20';
      case 'overdue':
        return 'text-red-400 bg-red-500/20';
      case 'approval':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'system':
        return 'text-cyan-400 bg-cyan-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const badgeColors = {
      success: 'bg-green-500/20 text-green-400 border-green-500/30',
      warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      error: 'bg-red-500/20 text-red-400 border-red-500/30',
      info: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badgeColors[status]}`}>
        {status}
      </span>
    );
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `R${(amount / 1000).toFixed(1)}K`;
    }
    return `R${amount.toLocaleString()}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Live updates</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {displayedActivities.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">No recent activity</div>
              <div className="text-sm text-gray-500">Activities will appear here as they happen</div>
            </div>
          ) : (
            displayedActivities.map((activity, index) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className={`p-2 rounded-lg ${getActivityColor(activity.type, activity.status)}`}>
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white mb-1">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-gray-400 mb-2">
                        {activity.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {activity.amount && (
                        <div className="text-sm font-semibold text-green-400">
                          {formatAmount(activity.amount)}
                        </div>
                      )}
                      {getStatusBadge(activity.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                    {activity.metadata && (
                      <div className="text-xs text-gray-500">
                        {activity.metadata.facility && (
                          <span className="flex items-center space-x-1">
                            <Home className="w-3 h-3" />
                            <span>{activity.metadata.facility}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {activities.length > maxItems && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <button className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
              View all {activities.length} activities →
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ActivityFeed;
