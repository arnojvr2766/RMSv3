import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { paymentScheduleMigrationService } from '../services/paymentScheduleMigrationService';

interface SettingsContextType {
  allowStandardUserFacilities: boolean;
  allowStandardUserRooms: boolean;
  paymentDueDate: 'first_day' | 'last_day';
  setAllowStandardUserFacilities: (value: boolean) => void;
  setAllowStandardUserRooms: (value: boolean) => void;
  setPaymentDueDate: (value: 'first_day' | 'last_day') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

// Settings storage key
const SETTINGS_STORAGE_KEY = 'rms_settings';

// Default settings
const defaultSettings = {
  allowStandardUserFacilities: false,
  allowStandardUserRooms: false,
  paymentDueDate: 'first_day' as 'first_day' | 'last_day',
};

// Load settings from localStorage
const loadSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }
  return defaultSettings;
};

// Save settings to localStorage
const saveSettings = (settings: typeof defaultSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);

  // Load settings on component mount and run migration if needed
  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    
    // Run migration to add paymentDueDateSetting field to existing schedules
    const runMigration = async () => {
      try {
        const needsMigration = await paymentScheduleMigrationService.isMigrationNeeded();
        if (needsMigration) {
          console.log('Running payment schedule migration...');
          const result = await paymentScheduleMigrationService.addPaymentDueDateSettingField(loadedSettings.paymentDueDate);
          console.log('Migration completed:', result);
        }
      } catch (error) {
        console.error('Error running migration:', error);
      }
    };
    
    runMigration();
  }, []);

  // Wrapper functions that update both state and localStorage
  const setAllowStandardUserFacilities = (value: boolean) => {
    const newSettings = { ...settings, allowStandardUserFacilities: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const setAllowStandardUserRooms = (value: boolean) => {
    const newSettings = { ...settings, allowStandardUserRooms: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const setPaymentDueDate = (value: 'first_day' | 'last_day') => {
    // Simply update the setting - new payment schedules will use this setting
    const newSettings = { ...settings, paymentDueDate: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <SettingsContext.Provider
      value={{
        allowStandardUserFacilities: settings.allowStandardUserFacilities,
        allowStandardUserRooms: settings.allowStandardUserRooms,
        paymentDueDate: settings.paymentDueDate,
        setAllowStandardUserFacilities,
        setAllowStandardUserRooms,
        setPaymentDueDate,
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
