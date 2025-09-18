import React from 'react';
import { Shield, User } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import type { UserRole } from '../../contexts/RoleContext';

const RoleToggle: React.FC = () => {
  const { currentRole, setCurrentRole } = useRole();

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-800 border border-gray-700 rounded-lg p-1">
      <button
        onClick={() => handleRoleChange('standard_user')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentRole === 'standard_user'
            ? 'bg-primary-500 text-black shadow-lg hover:-translate-y-0.5'
            : 'text-secondary hover:text-white hover:bg-gray-700'
        }`}
      >
        <User className="w-4 h-4" />
        <span>Standard User</span>
      </button>
      
      <button
        onClick={() => handleRoleChange('system_admin')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
          currentRole === 'system_admin'
            ? 'bg-primary-500 text-black shadow-lg hover:-translate-y-0.5'
            : 'text-secondary hover:text-white hover:bg-gray-700'
        }`}
      >
        <Shield className="w-4 h-4" />
        <span>System Admin</span>
      </button>
    </div>
  );
};

export default RoleToggle;
