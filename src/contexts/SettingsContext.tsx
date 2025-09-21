import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { settingsService, type UserSettings } from '../services/settingsService';

interface SettingsContextType {
  // UI Settings (User-specific)
  defaultViewMode: 'cards' | 'table';
  itemsPerPage: number;
  showAdvancedOptions: boolean;
  setDefaultViewMode: (value: 'cards' | 'table') => void;
  setItemsPerPage: (value: number) => void;
  setShowAdvancedOptions: (value: boolean) => void;
  
  // Notification Settings (User-specific)
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

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(settingsService.getDefaultSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Load settings from cache immediately for fast UI
  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem('rms_user_settings_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading settings from cache:', error);
    }
  };

  // Save settings to cache
  const saveToCache = (settingsToCache: UserSettings) => {
    try {
      localStorage.setItem('rms_user_settings_cache', JSON.stringify(settingsToCache));
    } catch (error) {
      console.error('Error saving settings to cache:', error);
    }
  };

  // Initialize settings
  useEffect(() => {
    const initializeSettings = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Load from cache immediately
        loadFromCache();
        
        // Then load from Firestore
        const firestoreSettings = await settingsService.getUserSettings(user.uid);
        
        if (firestoreSettings) {
          setSettings(firestoreSettings);
          saveToCache(firestoreSettings);
        } else {
          // Check for old localStorage settings and migrate
          const oldSettings = localStorage.getItem('rms_settings');
          if (oldSettings) {
            const migratedSettings = await settingsService.migrateFromLocalStorage(user.uid);
            setSettings(migratedSettings);
            saveToCache(migratedSettings);
          } else {
            // Create default settings in Firestore
            const defaultSettings = settingsService.getDefaultSettings();
            await settingsService.saveUserSettings(user.uid, defaultSettings);
            setSettings(defaultSettings);
            saveToCache(defaultSettings);
          }
        }
        
        setIsOffline(false);
      } catch (error) {
        console.error('Error initializing settings:', error);
        setIsOffline(true);
        // Use cached settings when offline
        loadFromCache();
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = settingsService.subscribeToUserSettings(user.uid, (newSettings) => {
      setSettings(newSettings);
      saveToCache(newSettings);
      setIsOffline(false);
    });

    return unsubscribe;
  }, [user]);

  // Generic update function
  const updateSetting = async (key: keyof UserSettings, value: any) => {
    if (!user?.uid) return;
    
    try {
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);
      saveToCache(updatedSettings);
      
      await settingsService.saveUserSettings(user.uid, { [key]: value });
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert on error
      setSettings(settings);
      throw error;
    }
  };

  // Individual setters
  const setDefaultViewMode = (value: 'cards' | 'table') => updateSetting('defaultViewMode', value);
  const setItemsPerPage = (value: number) => updateSetting('itemsPerPage', value);
  const setShowAdvancedOptions = (value: boolean) => updateSetting('showAdvancedOptions', value);
  const setEmailNotifications = (value: boolean) => updateSetting('emailNotifications', value);
  const setPushNotifications = (value: boolean) => updateSetting('pushNotifications', value);
  const setNotificationFrequency = (value: 'immediate' | 'daily' | 'weekly') => updateSetting('notificationFrequency', value);

  const value: SettingsContextType = {
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
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};