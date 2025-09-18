import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

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
  const [currentRole, setCurrentRole] = useState<UserRole>('system_admin');

  const isSystemAdmin = currentRole === 'system_admin';
  const isStandardUser = currentRole === 'standard_user';

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
