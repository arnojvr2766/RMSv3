import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UserSettings {
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
  
  // UI Settings
  defaultViewMode: 'cards' | 'table';
  itemsPerPage: number;
  showAdvancedOptions: boolean;
  
  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  
  // Future settings can be added here
  [key: string]: any;
}

export interface SettingsDocument {
  userId: string;
  settings: UserSettings;
  createdAt: any;
  updatedAt: any;
}

class SettingsService {
  private collectionName = 'userSettings';

  /**
   * Get user settings from Firestore
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const settingsRef = doc(db, this.collectionName, userId);
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as SettingsDocument;
        return data.settings;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
  }

  /**
   * Save user settings to Firestore
   */
  async saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    try {
      const settingsRef = doc(db, this.collectionName, userId);
      
      // Get existing settings to merge
      const existingSettings = await this.getUserSettings(userId);
      const mergedSettings = { ...existingSettings, ...settings };
      
      const updateData: any = {
        userId,
        settings: mergedSettings,
        updatedAt: serverTimestamp()
      };
      
      // Only set createdAt if this is a new document
      if (!existingSettings) {
        updateData.createdAt = serverTimestamp();
      }
      
      await setDoc(settingsRef, updateData, { merge: true });
      
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  }

  /**
   * Update specific setting fields
   */
  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<void> {
    try {
      const settingsRef = doc(db, this.collectionName, userId);
      
      await updateDoc(settingsRef, {
        [`settings.${Object.keys(updates)[0]}`]: Object.values(updates)[0],
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  /**
   * Listen to real-time changes in user settings
   */
  subscribeToUserSettings(userId: string, callback: (settings: UserSettings | null) => void): () => void {
    const settingsRef = doc(db, this.collectionName, userId);
    
    return onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as SettingsDocument;
        callback(data.settings);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error in settings subscription:', error);
      callback(null);
    });
  }

  /**
   * Get default settings
   */
  getDefaultSettings(): UserSettings {
    return {
      // Payment Settings
      paymentDueDate: 'first_day',
      allowStandardUserPastPayments: false,
      requireAdminApprovalForPastPayments: true,
      maxPastPaymentDays: 30,
      
      // User Permissions
      allowStandardUserFacilities: false,
      allowStandardUserRooms: false,
      allowStandardUserLeases: false,
      allowStandardUserPayments: false,
      allowStandardUserRenters: false,
      allowStandardUserMaintenance: false,
      allowStandardUserPenalties: false,
      
      // UI Settings
      defaultViewMode: 'cards',
      itemsPerPage: 20,
      showAdvancedOptions: false,
      
      // Notification Settings
      emailNotifications: true,
      pushNotifications: true,
      notificationFrequency: 'daily'
    };
  }

  /**
   * Migrate localStorage settings to Firestore
   */
  async migrateFromLocalStorage(userId: string): Promise<UserSettings> {
    try {
      // Get settings from localStorage
      const localSettings = localStorage.getItem('rentdesk-settings');
      let parsedSettings: Partial<UserSettings> = {};
      
      if (localSettings) {
        try {
          parsedSettings = JSON.parse(localSettings);
        } catch (error) {
          console.warn('Failed to parse localStorage settings:', error);
        }
      }

      // Get default settings
      const defaultSettings = this.getDefaultSettings();
      
      // Merge localStorage settings with defaults
      const migratedSettings = { ...defaultSettings, ...parsedSettings };
      
      // Save to Firestore
      await this.saveUserSettings(userId, migratedSettings);
      
      // Clear localStorage after successful migration
      localStorage.removeItem('rentdesk-settings');
      
      console.log('Settings migrated from localStorage to Firestore');
      return migratedSettings;
      
    } catch (error) {
      console.error('Error migrating settings:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();
