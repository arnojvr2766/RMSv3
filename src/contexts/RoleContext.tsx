import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';

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
      if (user?.uid) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            setCurrentRole(data.role === 'system_admin' ? 'system_admin' : 'standard_user');
          } else {
            setCurrentRole('standard_user');
          }
        } catch (error) {
          console.error('Error loading user role:', error);
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
