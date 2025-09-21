import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UserSettings {
  // UI Settings (User-specific)
  defaultViewMode: 'cards' | 'table';
  itemsPerPage: number;
  showAdvancedOptions: boolean;
  
  // Notification Settings (User-specific)
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

class SettingsService {
  private readonly collectionName = 'userSettings';

  /**
   * Get default user settings
   */
  getDefaultSettings(): UserSettings {
    return {
      // UI Settings
      defaultViewMode: 'cards',
      itemsPerPage: 25,
      showAdvancedOptions: false,
      
      // Notification Settings
      emailNotifications: true,
      pushNotifications: true,
      notificationFrequency: 'immediate',
      
      // Metadata
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const docRef = doc(db, this.collectionName, userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserSettings;
      }
      return null;
    } catch (error) {
      console.error('Error getting user settings:', error);
      throw error;
    }
  }

  /**
   * Save user settings
   */
  async saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, userId);
      const docSnap = await getDoc(docRef);
      
      const updateData = {
        ...settings,
        updatedAt: serverTimestamp()
      };

      if (docSnap.exists()) {
        await updateDoc(docRef, updateData);
      } else {
        await setDoc(docRef, {
          ...this.getDefaultSettings(),
          ...updateData,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw error;
    }
  }

  /**
   * Subscribe to user settings changes
   */
  subscribeToUserSettings(
    userId: string, 
    callback: (settings: UserSettings) => void
  ): () => void {
    const docRef = doc(db, this.collectionName, userId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserSettings);
      }
    });
  }

  /**
   * Migrate old localStorage settings to Firestore
   */
  async migrateFromLocalStorage(userId: string): Promise<UserSettings> {
    try {
      const oldSettings = localStorage.getItem('rms_settings');
      if (!oldSettings) {
        return this.getDefaultSettings();
      }

      const parsed = JSON.parse(oldSettings);
      
      // Map old settings to new structure (only UI and notification settings)
      const migratedSettings: UserSettings = {
        ...this.getDefaultSettings(),
        // Map any relevant old settings here if needed
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      };

      await this.saveUserSettings(userId, migratedSettings);
      
      // Remove old settings from localStorage
      localStorage.removeItem('rms_settings');
      
      return migratedSettings;
    } catch (error) {
      console.error('Error migrating settings from localStorage:', error);
      return this.getDefaultSettings();
    }
  }
}

export const settingsService = new SettingsService();