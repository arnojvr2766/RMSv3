import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserService } from '../services/userService';
import { leaseReminderService } from '../services/leaseReminderService';
import { roomAutoLockService } from '../services/roomAutoLockService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      
      // Track login activity and run daily checks when user signs in
      if (user) {
        try {
          await UserService.updateLastLogin(user.uid);
        } catch (error) {
          console.error('Error updating last login:', error);
        }

        // Run daily checks in background — won't block login
        // Check for lease expiry reminders
        leaseReminderService.getLeasesNeedingReminders().then(leases => {
          return Promise.all(leases.map(lease =>
            leaseReminderService.createReminderNotifications(lease)
          ));
        }).catch(err => console.error('Error running lease reminder check:', err));

        // Auto-lock overdue rooms
        roomAutoLockService.checkAndLockOverdueRooms()
          .catch(err => console.error('Error running room auto-lock check:', err));
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
