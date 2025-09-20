import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { settingsService, type UserSettings } from '../services/settingsService';
import { paymentScheduleMigrationService } from '../services/paymentScheduleMigrationService';

interface SettingsContextType {
  // Payment Settings
  paymentDueDate: 'first_day' | 'last_day';
  allowStandardUserPastPayments: boolean;
  requireAdminApprovalForPastPayments: boolean;
  maxPastPaymentDays: number;
  setPaymentDueDate: (value: 'first_day' | 'last_day') => void;
  setAllowStandardUserPastPayments: (value: boolean) => void;
  setRequireAdminApprovalForPastPayments: (value: boolean) => void;
  setMaxPastPaymentDays: (value: number) => void;
  
  // User Permissions
  allowStandardUserFacilities: boolean;
  allowStandardUserRooms: boolean;
  allowStandardUserLeases: boolean;
  allowStandardUserPayments: boolean;
  allowStandardUserRenters: boolean;
  allowStandardUserMaintenance: boolean;
  allowStandardUserPenalties: boolean;
  setAllowStandardUserFacilities: (value: boolean) => void;
  setAllowStandardUserRooms: (value: boolean) => void;
  setAllowStandardUserLeases: (value: boolean) => void;
  setAllowStandardUserPayments: (value: boolean) => void;
  setAllowStandardUserRenters: (value: boolean) => void;
  setAllowStandardUserMaintenance: (value: boolean) => void;
  setAllowStandardUserPenalties: (value: boolean) => void;
  
  // UI Settings
  defaultViewMode: 'cards' | 'table';
  itemsPerPage: number;
  showAdvancedOptions: boolean;
  setDefaultViewMode: (value: 'cards' | 'table') => void;
  setItemsPerPage: (value: number) => void;
  setShowAdvancedOptions: (value: boolean) => void;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  setEmailNotifications: (value: boolean) => void;
  setPushNotifications: (value: boolean) => void;
  setNotificationFrequency: (value: 'immediate' | 'daily' | 'weekly') => void;
  
  // Loading state
  isLoading: boolean;
  isOffline: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

// LocalStorage cache key
const CACHE_KEY = 'rentdesk-settings-cache';

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(settingsService.getDefaultSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Load settings from cache immediately for fast UI
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading settings from cache:', error);
    }
  };

  // Save to cache
  const saveToCache = (newSettings: UserSettings) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings to cache:', error);
    }
  };

  // Initialize settings when user changes
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    const initializeSettings = async () => {
      try {
        setIsLoading(true);
        
        // Load from cache immediately
        loadFromCache();
        
        // Try to load from Firestore
        let firestoreSettings = await settingsService.getUserSettings(user.uid);
        
        // If no Firestore settings, check for old localStorage settings and migrate
        if (!firestoreSettings) {
          const oldSettings = localStorage.getItem('rms_settings');
          if (oldSettings) {
            console.log('Migrating old localStorage settings to Firestore...');
            firestoreSettings = await settingsService.migrateFromLocalStorage(user.uid);
          } else {
            // Create default settings in Firestore
            firestoreSettings = settingsService.getDefaultSettings();
            await settingsService.saveUserSettings(user.uid, firestoreSettings);
          }
        }
        
        // Update state with Firestore settings
        setSettings(firestoreSettings);
        saveToCache(firestoreSettings);
        
        // Run payment schedule migration if needed
        const needsMigration = await paymentScheduleMigrationService.isMigrationNeeded();
        if (needsMigration) {
          console.log('Running payment schedule migration...');
          await paymentScheduleMigrationService.addPaymentDueDateSettingField(firestoreSettings.paymentDueDate);
          console.log('Migration completed');
        }
        
        setIsOffline(false);
      } catch (error) {
        console.error('Error initializing settings:', error);
        setIsOffline(true);
        // Fall back to cache if available
        loadFromCache();
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, [user?.uid]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = settingsService.subscribeToUserSettings(user.uid, (newSettings) => {
      if (newSettings) {
        setSettings(newSettings);
        saveToCache(newSettings);
        setIsOffline(false);
      }
    });

    return unsubscribe;
  }, [user?.uid]);

  // Generic update function
  const updateSetting = async <K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveToCache(newSettings);

    // Try to save to Firestore
    if (user?.uid) {
      try {
        await settingsService.saveUserSettings(user.uid, { [key]: value });
        setIsOffline(false);
      } catch (error) {
        console.error('Error saving setting to Firestore:', error);
        setIsOffline(true);
      }
    }
  };

  // Payment Settings
  const setPaymentDueDate = (value: 'first_day' | 'last_day') => {
    updateSetting('paymentDueDate', value);
  };

  const setAllowStandardUserPastPayments = (value: boolean) => {
    updateSetting('allowStandardUserPastPayments', value);
  };

  const setRequireAdminApprovalForPastPayments = (value: boolean) => {
    updateSetting('requireAdminApprovalForPastPayments', value);
  };

  const setMaxPastPaymentDays = (value: number) => {
    updateSetting('maxPastPaymentDays', value);
  };

  // User Permissions
  const setAllowStandardUserFacilities = (value: boolean) => {
    updateSetting('allowStandardUserFacilities', value);
  };

  const setAllowStandardUserRooms = (value: boolean) => {
    updateSetting('allowStandardUserRooms', value);
  };

  const setAllowStandardUserLeases = (value: boolean) => {
    updateSetting('allowStandardUserLeases', value);
  };

  const setAllowStandardUserPayments = (value: boolean) => {
    updateSetting('allowStandardUserPayments', value);
  };

  const setAllowStandardUserRenters = (value: boolean) => {
    updateSetting('allowStandardUserRenters', value);
  };

  const setAllowStandardUserMaintenance = (value: boolean) => {
    updateSetting('allowStandardUserMaintenance', value);
  };

  const setAllowStandardUserPenalties = (value: boolean) => {
    updateSetting('allowStandardUserPenalties', value);
  };

  // UI Settings
  const setDefaultViewMode = (value: 'cards' | 'table') => {
    updateSetting('defaultViewMode', value);
  };

  const setItemsPerPage = (value: number) => {
    updateSetting('itemsPerPage', value);
  };

  const setShowAdvancedOptions = (value: boolean) => {
    updateSetting('showAdvancedOptions', value);
  };

  // Notification Settings
  const setEmailNotifications = (value: boolean) => {
    updateSetting('emailNotifications', value);
  };

  const setPushNotifications = (value: boolean) => {
    updateSetting('pushNotifications', value);
  };

  const setNotificationFrequency = (value: 'immediate' | 'daily' | 'weekly') => {
    updateSetting('notificationFrequency', value);
  };

  return (
    <SettingsContext.Provider
      value={{
        // Payment Settings
        paymentDueDate: settings.paymentDueDate,
        allowStandardUserPastPayments: settings.allowStandardUserPastPayments,
        requireAdminApprovalForPastPayments: settings.requireAdminApprovalForPastPayments,
        maxPastPaymentDays: settings.maxPastPaymentDays,
        setPaymentDueDate,
        setAllowStandardUserPastPayments,
        setRequireAdminApprovalForPastPayments,
        setMaxPastPaymentDays,
        
        // User Permissions
        allowStandardUserFacilities: settings.allowStandardUserFacilities,
        allowStandardUserRooms: settings.allowStandardUserRooms,
        allowStandardUserLeases: settings.allowStandardUserLeases,
        allowStandardUserPayments: settings.allowStandardUserPayments,
        allowStandardUserRenters: settings.allowStandardUserRenters,
        allowStandardUserMaintenance: settings.allowStandardUserMaintenance,
        allowStandardUserPenalties: settings.allowStandardUserPenalties,
        setAllowStandardUserFacilities,
        setAllowStandardUserRooms,
        setAllowStandardUserLeases,
        setAllowStandardUserPayments,
        setAllowStandardUserRenters,
        setAllowStandardUserMaintenance,
        setAllowStandardUserPenalties,
        
        // UI Settings
        defaultViewMode: settings.defaultViewMode,
        itemsPerPage: settings.itemsPerPage,
        showAdvancedOptions: settings.showAdvancedOptions,
        setDefaultViewMode,
        setItemsPerPage,
        setShowAdvancedOptions,
        
        // Notification Settings
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        notificationFrequency: settings.notificationFrequency,
        setEmailNotifications,
        setPushNotifications,
        setNotificationFrequency,
        
        // Loading state
        isLoading,
        isOffline,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
