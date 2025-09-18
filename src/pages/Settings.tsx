import React, { useState } from 'react';
import { Settings, Shield, Users, Building2, DoorClosed, RotateCcw, Check, Calendar } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useRole } from '../contexts/RoleContext';
import Button from '../components/ui/Button';

const SettingsPage: React.FC = () => {
  const { 
    allowStandardUserFacilities, 
    allowStandardUserRooms,
    paymentDueDate,
    setAllowStandardUserFacilities,
    setAllowStandardUserRooms,
    setPaymentDueDate
  } = useSettings();
  const { currentRole, isSystemAdmin } = useRole();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      setAllowStandardUserFacilities(false);
      setAllowStandardUserRooms(false);
      setPaymentDueDate('first_day');
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

        {/* Success Notification */}
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
            <Check className="w-5 h-5" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* Current Role Display */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
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
        </div>

        {/* User Permissions Settings */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-semibold text-white">Standard User Permissions</h2>
          </div>
          
          <div className="space-y-6">
            {/* Facilities Permission */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="text-white font-medium">Allow Standard Users to Manage Facilities</h3>
                  <p className="text-gray-400 text-sm">Enable standard users to create, edit, and manage facilities</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowStandardUserFacilities}
                  onChange={(e) => handleSettingChange(setAllowStandardUserFacilities, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {/* Rooms Permission */}
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <DoorClosed className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="text-white font-medium">Allow Standard Users to Manage Rooms</h3>
                  <p className="text-gray-400 text-sm">Enable standard users to create, edit, and manage rooms</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowStandardUserRooms}
                  onChange={(e) => handleSettingChange(setAllowStandardUserRooms, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <Calendar className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-semibold text-white">Payment Settings</h2>
          </div>
          
          <div className="space-y-6">
            {/* Payment Due Date Setting */}
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3 mb-4">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <h3 className="text-white font-medium">Payment Due Date</h3>
                  <p className="text-gray-400 text-sm">Choose when monthly payments are considered due</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
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
                    <p className="text-gray-400 text-sm">Payments are due on the 1st of each month (e.g., September rent due on September 1st)</p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
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
          </div>
        </div>

        {/* Future Settings Placeholder */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-center">
            <Settings className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Additional Settings</h2>
            <p className="text-gray-400 mb-6">
              More system settings will be added here in future updates:
            </p>
            <ul className="text-gray-400 text-left max-w-md mx-auto space-y-2">
              <li>• User management</li>
              <li>• Notification preferences</li>
              <li>• System preferences</li>
              <li>• Security settings</li>
              <li>• Backup configuration</li>
              <li>• Integration settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
