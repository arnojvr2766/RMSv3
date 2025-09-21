import React, { createContext, useContext, useState, useEffect } from 'react';
import { organizationSettingsService, type OrganizationSettings } from '../services/organizationSettingsService';
import { useAuth } from './AuthContext';

interface OrganizationSettingsContextType {
  settings: OrganizationSettings;
  isLoading: boolean;
  isOffline: boolean;
  updateSetting: (key: keyof OrganizationSettings, value: any) => Promise<void>;
  
  // Payment Settings
  paymentDueDate: 'first_day' | 'last_day';
  allowStandardUserPastPayments: boolean;
  requireAdminApprovalForPastPayments: boolean;
  maxPastPaymentDays: number;
  
  // User Permissions
  allowStandardUserFacilities: boolean;
  allowStandardUserRooms: boolean;
  allowStandardUserLeases: boolean;
  allowStandardUserPayments: boolean;
  allowStandardUserRenters: boolean;
  allowStandardUserMaintenance: boolean;
  allowStandardUserPenalties: boolean;
  
  // Business Rules
  defaultLateFee: number;
  defaultChildSurcharge: number;
  
  // Setters
  setPaymentDueDate: (value: 'first_day' | 'last_day') => Promise<void>;
  setAllowStandardUserPastPayments: (value: boolean) => Promise<void>;
  setRequireAdminApprovalForPastPayments: (value: boolean) => Promise<void>;
  setMaxPastPaymentDays: (value: number) => Promise<void>;
  setAllowStandardUserFacilities: (value: boolean) => Promise<void>;
  setAllowStandardUserRooms: (value: boolean) => Promise<void>;
  setAllowStandardUserLeases: (value: boolean) => Promise<void>;
  setAllowStandardUserPayments: (value: boolean) => Promise<void>;
  setAllowStandardUserRenters: (value: boolean) => Promise<void>;
  setAllowStandardUserMaintenance: (value: boolean) => Promise<void>;
  setAllowStandardUserPenalties: (value: boolean) => Promise<void>;
  setDefaultLateFee: (value: number) => Promise<void>;
  setDefaultChildSurcharge: (value: number) => Promise<void>;
}

const OrganizationSettingsContext = createContext<OrganizationSettingsContextType | undefined>(undefined);

interface OrganizationSettingsProviderProps {
  children: React.ReactNode;
}

export const OrganizationSettingsProvider: React.FC<OrganizationSettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OrganizationSettings>(organizationSettingsService.getDefaultSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Initialize organization settings
  useEffect(() => {
    const initializeSettings = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const orgSettings = await organizationSettingsService.getOrganizationSettings();
        setSettings(orgSettings);
        setIsOffline(false);
      } catch (error) {
        console.error('Error loading organization settings:', error);
        setIsOffline(true);
        // Use default settings when offline
        setSettings(organizationSettingsService.getDefaultSettings());
      } finally {
        setIsLoading(false);
      }
    };

    initializeSettings();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = organizationSettingsService.subscribeToOrganizationSettings((newSettings) => {
      setSettings(newSettings);
      setIsOffline(false);
    });

    return unsubscribe;
  }, [user]);

  // Generic update function
  const updateSetting = async (key: keyof OrganizationSettings, value: any) => {
    if (!user?.uid) return;
    
    try {
      await organizationSettingsService.updateSetting(key, value, user.uid);
      // The real-time subscription will update the state
    } catch (error) {
      console.error('Error updating organization setting:', error);
      throw error;
    }
  };

  // Individual setters
  const setPaymentDueDate = (value: 'first_day' | 'last_day') => updateSetting('paymentDueDate', value);
  const setAllowStandardUserPastPayments = (value: boolean) => updateSetting('allowStandardUserPastPayments', value);
  const setRequireAdminApprovalForPastPayments = (value: boolean) => updateSetting('requireAdminApprovalForPastPayments', value);
  const setMaxPastPaymentDays = (value: number) => updateSetting('maxPastPaymentDays', value);
  const setAllowStandardUserFacilities = (value: boolean) => updateSetting('allowStandardUserFacilities', value);
  const setAllowStandardUserRooms = (value: boolean) => updateSetting('allowStandardUserRooms', value);
  const setAllowStandardUserLeases = (value: boolean) => updateSetting('allowStandardUserLeases', value);
  const setAllowStandardUserPayments = (value: boolean) => updateSetting('allowStandardUserPayments', value);
  const setAllowStandardUserRenters = (value: boolean) => updateSetting('allowStandardUserRenters', value);
  const setAllowStandardUserMaintenance = (value: boolean) => updateSetting('allowStandardUserMaintenance', value);
  const setAllowStandardUserPenalties = (value: boolean) => updateSetting('allowStandardUserPenalties', value);
  const setDefaultLateFee = (value: number) => updateSetting('defaultLateFee', value);
  const setDefaultChildSurcharge = (value: number) => updateSetting('defaultChildSurcharge', value);

  const value: OrganizationSettingsContextType = {
    settings,
    isLoading,
    isOffline,
    updateSetting,
    
    // Payment Settings
    paymentDueDate: settings.paymentDueDate,
    allowStandardUserPastPayments: settings.allowStandardUserPastPayments,
    requireAdminApprovalForPastPayments: settings.requireAdminApprovalForPastPayments,
    maxPastPaymentDays: settings.maxPastPaymentDays,
    
    // User Permissions
    allowStandardUserFacilities: settings.allowStandardUserFacilities,
    allowStandardUserRooms: settings.allowStandardUserRooms,
    allowStandardUserLeases: settings.allowStandardUserLeases,
    allowStandardUserPayments: settings.allowStandardUserPayments,
    allowStandardUserRenters: settings.allowStandardUserRenters,
    allowStandardUserMaintenance: settings.allowStandardUserMaintenance,
    allowStandardUserPenalties: settings.allowStandardUserPenalties,
    
    // Business Rules
    defaultLateFee: settings.defaultLateFee,
    defaultChildSurcharge: settings.defaultChildSurcharge,
    
    // Setters
    setPaymentDueDate,
    setAllowStandardUserPastPayments,
    setRequireAdminApprovalForPastPayments,
    setMaxPastPaymentDays,
    setAllowStandardUserFacilities,
    setAllowStandardUserRooms,
    setAllowStandardUserLeases,
    setAllowStandardUserPayments,
    setAllowStandardUserRenters,
    setAllowStandardUserMaintenance,
    setAllowStandardUserPenalties,
    setDefaultLateFee,
    setDefaultChildSurcharge,
  };

  return (
    <OrganizationSettingsContext.Provider value={value}>
      {children}
    </OrganizationSettingsContext.Provider>
  );
};

export const useOrganizationSettings = (): OrganizationSettingsContextType => {
  const context = useContext(OrganizationSettingsContext);
  if (context === undefined) {
    throw new Error('useOrganizationSettings must be used within an OrganizationSettingsProvider');
  }
  return context;
};
