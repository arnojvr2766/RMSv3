import React, { useState, useEffect } from 'react';
import { Settings, Shield, Users, Building2, DoorClosed, RotateCcw, Check, Calendar, UserPlus, Mail, User, Crown, Wifi, WifiOff, Eye, Bell, Monitor, Database, Download, X, MoreVertical, Edit, Trash2, UserCheck, UserX } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useOrganizationSettings } from '../contexts/OrganizationSettingsContext';
import { useRole } from '../contexts/RoleContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { UserService, type CreateUserRequest, type User as UserType } from '../services/userService';

const SettingsPage: React.FC = () => {
  // User-specific settings (UI preferences)
  const { 
    defaultViewMode,
    itemsPerPage,
    showAdvancedOptions,
    setDefaultViewMode,
    setItemsPerPage,
    setShowAdvancedOptions,
    emailNotifications,
    pushNotifications,
    notificationFrequency,
    setEmailNotifications,
    setPushNotifications,
    setNotificationFrequency,
    isLoading: userSettingsLoading,
    isOffline: userSettingsOffline
  } = useSettings();

  // Organization-wide settings (business rules)
  const {
    paymentDueDate,
    allowStandardUserPastPayments,
    requireAdminApprovalForPastPayments,
    maxPastPaymentDays,
    setPaymentDueDate,
    setAllowStandardUserPastPayments,
    setRequireAdminApprovalForPastPayments,
    setMaxPastPaymentDays,
    allowStandardUserFacilities, 
    allowStandardUserRooms,
    allowStandardUserLeases,
    allowStandardUserPayments,
    allowStandardUserRenters,
    allowStandardUserMaintenance,
    allowStandardUserPenalties,
    setAllowStandardUserFacilities,
    setAllowStandardUserRooms,
    setAllowStandardUserLeases,
    setAllowStandardUserPayments,
    setAllowStandardUserRenters,
    setAllowStandardUserMaintenance,
    setAllowStandardUserPenalties,
    defaultLateFee,
    setDefaultLateFee,
    defaultChildSurcharge,
    setDefaultChildSurcharge,
    isLoading: orgSettingsLoading,
    isOffline: orgSettingsOffline
  } = useOrganizationSettings();
  const { currentRole, isSystemAdmin } = useRole();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'user-management' | 'payment' | 'ui' | 'notifications' | 'data'>('payment');
  
  // User creation state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUserCreation, setShowUserCreation] = useState(false);
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'standard_user' as 'system_admin' | 'standard_user'
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userCreationMessage, setUserCreationMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // User list state
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userActionMessage, setUserActionMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Debug logging for settings
  useEffect(() => {
    console.log('Settings Debug:', {
      orgSettingsLoading,
      allowStandardUserPastPayments,
      requireAdminApprovalForPastPayments,
      maxPastPaymentDays
    });
  }, [orgSettingsLoading, allowStandardUserPastPayments, requireAdminApprovalForPastPayments, maxPastPaymentDays]);

  // Load users when user management tab is active
  useEffect(() => {
    if (activeTab === 'user-management' && isSystemAdmin) {
      loadUsers();
    }
  }, [activeTab, isSystemAdmin]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const userList = await UserService.getAllUsers();
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
      setUserActionMessage({
        type: 'error',
        message: 'Failed to load users'
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUserStatusChange = async (userId: string, newStatus: 'active' | 'disabled') => {
    try {
      await UserService.updateUserStatus(userId, newStatus);
      setUserActionMessage({
        type: 'success',
        message: `User ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`
      });
      // Reload users to reflect changes
      await loadUsers();
      // Hide message after 3 seconds
      setTimeout(() => setUserActionMessage(null), 3000);
    } catch (error) {
      console.error('Error updating user status:', error);
      setUserActionMessage({
        type: 'error',
        message: 'Failed to update user status'
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      try {
        await UserService.deleteUser(userId);
        setUserActionMessage({
          type: 'success',
          message: 'User deleted successfully'
        });
        // Reload users to reflect changes
        await loadUsers();
        // Hide message after 3 seconds
        setTimeout(() => setUserActionMessage(null), 3000);
      } catch (error) {
        console.error('Error deleting user:', error);
        setUserActionMessage({
          type: 'error',
          message: 'Failed to delete user'
        });
      }
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Never';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'disabled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'system_admin':
        return 'bg-primary-500/20 text-primary-400';
      case 'standard_user':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      // Payment Settings
      setPaymentDueDate('first_day');
      setAllowStandardUserPastPayments(false);
      setRequireAdminApprovalForPastPayments(true);
      setMaxPastPaymentDays(30);
      
      // User Permissions
      setAllowStandardUserFacilities(false);
      setAllowStandardUserRooms(false);
      setAllowStandardUserLeases(false);
      setAllowStandardUserPayments(false);
      setAllowStandardUserRenters(false);
      setAllowStandardUserMaintenance(false);
      setAllowStandardUserPenalties(false);
      
      // UI Settings
      setDefaultViewMode('cards');
      setItemsPerPage(20);
      setShowAdvancedOptions(false);
      
      // Notification Settings
      setEmailNotifications(true);
      setPushNotifications(true);
      setNotificationFrequency('daily');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleSettingChange = (setter: (value: boolean) => void, value: boolean) => {
    setter(value);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handlePaymentDueDateChange = (newValue: 'first_day' | 'last_day') => {
    if (newValue === paymentDueDate) return;
    setPaymentDueDate(newValue);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleUserFormChange = (field: keyof typeof userFormData, value: string) => {
    setUserFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUser(true);
    setUserCreationMessage(null);

    try {
      const request: CreateUserRequest = {
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        email: userFormData.email,
        role: userFormData.role
      };

      await UserService.createUserInvitation(request);
      
      setUserCreationMessage({
        type: 'success',
        message: 'User invitation sent successfully!'
      });
      
      // Reset form
      setUserFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'standard_user'
      });
      setShowUserCreation(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setUserCreationMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error creating user:', error);
      setUserCreationMessage({
        type: 'error',
        message: 'Failed to create user. Please try again.'
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-secondary-900" />
              </div>
              <h1 className="text-3xl font-bold text-white">Settings</h1>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetSettings}
              className="flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Settings</span>
            </Button>
          </div>
          <p className="text-gray-400 text-lg">
            System configuration, feature flags, and user management
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('user-management')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'user-management'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>User Management</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'payment'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Payment Settings</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ui')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ui'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>User Interface</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notifications'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('data')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'data'
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>Data Management</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Success Notification */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
            <Check className="w-5 h-5" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* User Creation Success/Error Message */}
        {userCreationMessage && (
          <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 ${
            userCreationMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {userCreationMessage.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span>{userCreationMessage.message}</span>
          </div>
        )}

        {/* User Action Success/Error Message */}
        {userActionMessage && (
          <div className={`fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 ${
            userActionMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {userActionMessage.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <X className="w-5 h-5" />
            )}
            <span>{userActionMessage.message}</span>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'user-management' && (
          <div className="space-y-6">
        {/* Current Role Display */}
            <Card className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-semibold text-white">Current Role</h2>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isSystemAdmin 
                ? 'bg-primary-500 text-secondary-900' 
                : 'bg-accent-blue-500 text-white'
            }`}>
              {currentRole === 'system_admin' ? 'System Administrator' : 'Standard User'}
            </div>
            <span className="text-gray-400 text-sm">
              {isSystemAdmin ? 'Full system access' : 'Limited access based on settings'}
            </span>
          </div>
            </Card>

            {/* User Creation Section - Only visible to System Admins */}
            {isSystemAdmin && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <UserPlus className="w-6 h-6 text-primary-500" />
                    <h2 className="text-xl font-semibold text-white">Create New User</h2>
                  </div>
                  <Button
                    onClick={() => setShowUserCreation(!showUserCreation)}
                    className="flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{showUserCreation ? 'Cancel' : 'Create User'}</span>
                  </Button>
        </div>

                {showUserCreation && (
                  <div className="bg-gray-700 rounded-lg p-6">
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="First Name"
                          value={userFormData.firstName}
                          onChange={(e) => handleUserFormChange('firstName', e.target.value)}
                          required
                        />
                        <Input
                          label="Last Name"
                          value={userFormData.lastName}
                          onChange={(e) => handleUserFormChange('lastName', e.target.value)}
                          required
                        />
                      </div>
                      <Input
                        label="Email Address"
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => handleUserFormChange('email', e.target.value)}
                        required
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">Role</label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="role"
                              value="standard_user"
                              checked={userFormData.role === 'standard_user'}
                              onChange={(e) => handleUserFormChange('role', e.target.value as 'system_admin' | 'standard_user')}
                              className="w-4 h-4 text-primary-500 bg-gray-600 border-gray-500 focus:ring-primary-500 focus:ring-2"
                            />
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-white">Standard User</span>
                            </div>
                          </label>
                          <label className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="role"
                              value="system_admin"
                              checked={userFormData.role === 'system_admin'}
                              onChange={(e) => handleUserFormChange('role', e.target.value as 'system_admin' | 'standard_user')}
                              className="w-4 h-4 text-primary-500 bg-gray-600 border-gray-500 focus:ring-primary-500 focus:ring-2"
                            />
                            <div className="flex items-center space-x-2">
                              <Crown className="w-4 h-4 text-yellow-400" />
                              <span className="text-white">System Administrator</span>
                            </div>
                          </label>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={isCreatingUser}
                        className="w-full flex items-center justify-center space-x-2"
                      >
                        {isCreatingUser ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Sending Invitation...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            <span>Send Invitation</span>
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                )}
              </Card>
            )}

            {/* User List */}
            {isSystemAdmin && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-primary-500" />
                    <h2 className="text-xl font-semibold text-white">All Users</h2>
                  </div>
                  <Button
                    onClick={loadUsers}
                    disabled={isLoadingUsers}
                    variant="secondary"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Refresh</span>
                  </Button>
                </div>

                {isLoadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-gray-400">Loading users...</span>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No Users Found</h3>
                    <p className="text-gray-500">Create your first user using the form above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">User</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Last Login</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Login Count</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Created</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-gray-300" />
                                </div>
                                <div>
                                  <div className="text-white font-medium">
                                    {user.firstName} {user.lastName}
                                  </div>
                                  <div className="text-gray-400 text-sm">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                {user.role === 'system_admin' ? 'System Admin' : 'Standard User'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-gray-400 text-sm">
                              {formatDate(user.lastLoginAt)}
                            </td>
                            <td className="py-4 px-4 text-gray-400 text-sm">
                              {user.loginCount || 0}
                            </td>
                            <td className="py-4 px-4 text-gray-400 text-sm">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                {user.status === 'active' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUserStatusChange(user.id, 'disabled')}
                                    title="Disable User"
                                    className="text-yellow-400 hover:text-yellow-300"
                                  >
                                    <UserX className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUserStatusChange(user.id, 'active')}
                                    title="Enable User"
                                    className="text-green-400 hover:text-green-300"
                                  >
                                    <UserCheck className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                                  title="Delete User"
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
          
        {activeTab === 'payment' && (
          <div className="space-y-6">
            {/* Payment Due Date Settings */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Calendar className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-semibold text-white">Payment Due Date</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="paymentDueDate"
                      value="first_day"
                      checked={paymentDueDate === 'first_day'}
                      onChange={(e) => handlePaymentDueDateChange(e.target.value as 'first_day' | 'last_day')}
                      className="w-4 h-4 text-primary-500 bg-gray-600 border-gray-500 focus:ring-primary-500 focus:ring-2"
                    />
                    <div>
                      <span className="text-white font-medium">First Day of Month</span>
                      <p className="text-gray-400 text-sm">Payments are due on the first day of each month (e.g., September rent due on September 1st)</p>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="paymentDueDate"
                      value="last_day"
                      checked={paymentDueDate === 'last_day'}
                      onChange={(e) => handlePaymentDueDateChange(e.target.value as 'first_day' | 'last_day')}
                      className="w-4 h-4 text-primary-500 bg-gray-600 border-gray-500 focus:ring-primary-500 focus:ring-2"
                    />
                    <div>
                      <span className="text-white font-medium">Last Day of Month</span>
                      <p className="text-gray-400 text-sm">Payments are due on the last day of each month (e.g., September rent due on September 30th)</p>
                    </div>
                  </label>
                </div>
                
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    <strong>Note:</strong> This setting affects when payments are considered overdue and how penalty calculations are performed. 
                    This setting will apply to new payment schedules created after the change.
                  </p>
                </div>
              </div>
            </Card>

            {/* Past Payment Settings */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="text-white font-medium">Past Payment Capture</h3>
                  <p className="text-gray-400 text-sm">Control how standard users can capture payments with past dates</p>
                  {orgSettingsLoading && (
                    <p className="text-yellow-400 text-xs mt-1">Loading settings...</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Allow Past Payments */}
                <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <h4 className="text-white font-medium">Allow Standard Users to Capture Past Payments</h4>
                      <p className="text-gray-400 text-sm">Enable standard users to backdate payments (e.g., tenant paid last week)</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowStandardUserPastPayments}
                      onChange={(e) => handleSettingChange(setAllowStandardUserPastPayments, e.target.checked)}
                      disabled={orgSettingsLoading}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 ${isLoading ? 'opacity-50' : ''}`}></div>
                  </label>
                </div>

                {/* Require Admin Approval */}
                {!orgSettingsLoading && allowStandardUserPastPayments && (
                  <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <div>
                        <h4 className="text-white font-medium">Require Admin Approval for Past Payments</h4>
                        <p className="text-gray-400 text-sm">Past payments from standard users will require system admin approval</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requireAdminApprovalForPastPayments}
                        onChange={(e) => handleSettingChange(setRequireAdminApprovalForPastPayments, e.target.checked)}
                        disabled={orgSettingsLoading}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 ${orgSettingsLoading ? 'opacity-50' : ''}`}></div>
                    </label>
                  </div>
                )}

                {/* Max Past Days */}
                {!orgSettingsLoading && allowStandardUserPastPayments && (
                  <div className="p-3 bg-gray-600 rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <h4 className="text-white font-medium">Maximum Days in the Past</h4>
                        <p className="text-gray-400 text-sm">Maximum number of days a payment can be backdated</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={maxPastPaymentDays}
                        onChange={(e) => setMaxPastPaymentDays(Number(e.target.value))}
                        disabled={orgSettingsLoading}
                        className={`w-20 px-3 py-2 bg-gray-700 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-primary-500 ${orgSettingsLoading ? 'opacity-50' : ''}`}
                      />
                      <span className="text-gray-400 text-sm">days</span>
                    </div>
                    
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                      <p className="text-yellow-400 text-xs">
                        <strong>System Admin Override:</strong> System administrators can always capture payments with any past date regardless of these settings.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'ui' && (
          <div className="space-y-6">
            {/* UI Settings */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Monitor className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-semibold text-white">User Interface Settings</h2>
              </div>
              
              <div className="space-y-6">
                {/* Default View Mode */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium">Default View Mode</h3>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="defaultViewMode"
                        value="cards"
                        checked={defaultViewMode === 'cards'}
                        onChange={(e) => setDefaultViewMode(e.target.value as 'cards' | 'table')}
                        className="w-4 h-4 text-primary-500 bg-gray-600 border-gray-500 focus:ring-primary-500 focus:ring-2"
                      />
                      <span className="text-white">Cards View</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="defaultViewMode"
                        value="table"
                        checked={defaultViewMode === 'table'}
                        onChange={(e) => setDefaultViewMode(e.target.value as 'cards' | 'table')}
                        className="w-4 h-4 text-primary-500 bg-gray-600 border-gray-500 focus:ring-primary-500 focus:ring-2"
                      />
                      <span className="text-white">Table View</span>
                    </label>
                  </div>
                </div>

                {/* Items Per Page */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium">Items Per Page</h3>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Show Advanced Options */}
                <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <div>
                      <h4 className="text-white font-medium">Show Advanced Options</h4>
                      <p className="text-gray-400 text-sm">Display advanced configuration options throughout the app</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAdvancedOptions}
                      onChange={(e) => handleSettingChange(setShowAdvancedOptions, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Notification Settings */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Bell className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
              </div>
              
              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <h4 className="text-white font-medium">Email Notifications</h4>
                      <p className="text-gray-400 text-sm">Receive important updates via email</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => handleSettingChange(setEmailNotifications, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
              <div className="flex items-center space-x-3">
                    <Bell className="w-4 h-4 text-gray-400" />
                <div>
                      <h4 className="text-white font-medium">Push Notifications</h4>
                      <p className="text-gray-400 text-sm">Receive browser push notifications</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                      checked={pushNotifications}
                      onChange={(e) => handleSettingChange(setPushNotifications, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

                {/* Notification Frequency */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium">Notification Frequency</h3>
                  <select
                    value={notificationFrequency}
                    onChange={(e) => setNotificationFrequency(e.target.value as 'immediate' | 'daily' | 'weekly')}
                    className="w-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily Summary</option>
                    <option value="weekly">Weekly Summary</option>
                  </select>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* Data Management */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <Database className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-semibold text-white">Data Management</h2>
        </div>

              <div className="space-y-6">
                {/* Export Functionality */}
                <div className="p-6 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600">
          <div className="text-center">
                    <Download className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">Export Functionality</h3>
                    <p className="text-gray-500 mb-4">
                      Export your data in various formats (CSV, Excel, PDF)
                    </p>
                    <div className="inline-flex items-center px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
                      <span className="text-sm font-medium">Coming Soon</span>
                    </div>
                  </div>
                </div>

                {/* Data Management Component */}
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Test Data Management</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Manage test data for development and testing purposes.
                  </p>
                  {/* Import DataManagement component here if needed */}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
