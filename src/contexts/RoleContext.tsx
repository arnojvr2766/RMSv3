import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { UserService } from '../services/userService';

export type UserRole = 'system_admin' | 'standard_user';

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isSystemAdmin: boolean;
  isStandardUser: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('standard_user');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const isSystemAdmin = currentRole === 'system_admin';
  const isStandardUser = currentRole === 'standard_user';

  useEffect(() => {
    const loadUserRole = async () => {
      if (user?.email) {
        try {
          console.log('🔍 Loading user role for:', user.email);
          const userData = await UserService.getUserByEmail(user.email);
          console.log('🔍 User data from Firestore:', userData);
          if (userData) {
            console.log('🔍 Setting role to:', userData.role);
            setCurrentRole(userData.role);
          } else {
            console.log('🔍 No user data found, defaulting to standard_user');
            setCurrentRole('standard_user');
          }
        } catch (error) {
          console.error('Error loading user role:', error);
          // Default to standard_user if there's an error
          setCurrentRole('standard_user');
        }
      } else {
        setCurrentRole('standard_user');
      }
      setIsLoading(false);
    };

    loadUserRole();
  }, [user]);

  const value: RoleContextType = {
    currentRole,
    setCurrentRole,
    isSystemAdmin,
    isStandardUser,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
