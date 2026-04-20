import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, Clock, X, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationService, type Notification } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'lease_expiry' | 'payment_overdue'>('all');

  useEffect(() => {
    if (!user?.uid) return;

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const allNotifications = await notificationService.getUserNotifications(user.uid, true);
        setNotifications(allNotifications);
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Subscribe to real-time updates
    const unsubscribe = notificationService.subscribeToUserNotifications(
      user.uid,
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'lease_expiry') return notification.type === 'lease_expiry';
    if (filter === 'payment_overdue') return notification.type === 'payment_overdue';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showError('Failed to mark notification as read.');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    try {
      await notificationService.markAllAsRead(user.uid);
    } catch (error) {
      console.error('Error marking all as read:', error);
      showError('Failed to mark all notifications as read.');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      showError('Failed to delete notification.');
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id!);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'lease_expiry':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'payment_overdue':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'approval_required':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'maintenance_due':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'room_unlocked':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'room_locked':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const groupNotificationsByDate = () => {
    const groups: Record<string, Notification[]> = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: [],
    };

    filteredNotifications.forEach(notification => {
      const date = notification.createdAt?.toDate ? notification.createdAt.toDate() : new Date();
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days === 0) {
        groups.today.push(notification);
      } else if (days === 1) {
        groups.yesterday.push(notification);
      } else if (days < 7) {
        groups.thisWeek.push(notification);
      } else {
        groups.older.push(notification);
      }
    });

    return groups;
  };

  const grouped = groupNotificationsByDate();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
            <p className="text-gray-400">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="secondary" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex space-x-2 mb-6">
          <Button
            variant={filter === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'unread' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Unread ({notifications.filter(n => !n.read).length})
          </Button>
          <Button
            variant={filter === 'lease_expiry' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('lease_expiry')}
          >
            Lease Expiry
          </Button>
          <Button
            variant={filter === 'payment_overdue' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('payment_overdue')}
          >
            Payment Overdue
          </Button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No notifications</h2>
              <p className="text-gray-400">You're all caught up!</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Today */}
            {grouped.today.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-400 mb-3">Today</h2>
                <div className="space-y-2">
                  {grouped.today.map(notification => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      onClick={handleNotificationClick}
                      getIcon={getNotificationIcon}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Yesterday */}
            {grouped.yesterday.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-400 mb-3">Yesterday</h2>
                <div className="space-y-2">
                  {grouped.yesterday.map(notification => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      onClick={handleNotificationClick}
                      getIcon={getNotificationIcon}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* This Week */}
            {grouped.thisWeek.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-400 mb-3">This Week</h2>
                <div className="space-y-2">
                  {grouped.thisWeek.map(notification => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      onClick={handleNotificationClick}
                      getIcon={getNotificationIcon}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Older */}
            {grouped.older.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-400 mb-3">Older</h2>
                <div className="space-y-2">
                  {grouped.older.map(notification => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onRead={handleMarkAsRead}
                      onDelete={handleDelete}
                      onClick={handleNotificationClick}
                      getIcon={getNotificationIcon}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface NotificationCardProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
  getIcon: (type: Notification['type']) => React.ReactNode;
  formatDate: (timestamp: any) => string;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onRead,
  onDelete,
  onClick,
  getIcon,
  formatDate,
}) => {
  return (
    <Card
      className={`cursor-pointer hover:bg-gray-700 transition-colors ${
        !notification.read ? 'bg-gray-700/50 border-l-4 border-l-primary-500' : ''
      }`}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start space-x-4 p-4">
        <div className="flex-shrink-0 mt-1">
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white">
                {notification.title}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {formatDate(notification.createdAt)}
              </p>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {!notification.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead(notification.id!);
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Mark as read"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id!);
                }}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Notifications;

