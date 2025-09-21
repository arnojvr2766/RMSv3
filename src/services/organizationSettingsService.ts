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

export interface OrganizationSettings {
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
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}

class OrganizationSettingsService {
  private readonly collectionName = 'organizationSettings';
  private readonly documentId = 'main'; // Single document for organization settings

  /**
   * Get default organization settings
   */
  getDefaultSettings(): OrganizationSettings {
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
      allowStandardUserPayments: true,
      allowStandardUserRenters: false,
      allowStandardUserMaintenance: false,
      allowStandardUserPenalties: false,
      
      // Business Rules
      defaultLateFee: 50,
      defaultChildSurcharge: 10,
      
      // Metadata
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      updatedBy: 'system'
    };
  }

  /**
   * Get organization settings
   */
  async getOrganizationSettings(): Promise<OrganizationSettings> {
    try {
      const docRef = doc(db, this.collectionName, this.documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as OrganizationSettings;
      } else {
        // Create default settings if they don't exist
        const defaultSettings = this.getDefaultSettings();
        await this.saveOrganizationSettings(defaultSettings, 'system');
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error getting organization settings:', error);
      throw error;
    }
  }

  /**
   * Save organization settings
   */
  async saveOrganizationSettings(
    settings: Partial<OrganizationSettings>, 
    updatedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, this.documentId);
      const docSnap = await getDoc(docRef);
      
      const updateData = {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy
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
      console.error('Error saving organization settings:', error);
      throw error;
    }
  }

  /**
   * Subscribe to organization settings changes
   */
  subscribeToOrganizationSettings(
    callback: (settings: OrganizationSettings) => void
  ): () => void {
    const docRef = doc(db, this.collectionName, this.documentId);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as OrganizationSettings);
      } else {
        // If no settings exist, create default ones
        this.getOrganizationSettings().then(callback);
      }
    });
  }

  /**
   * Update a specific setting
   */
  async updateSetting(
    key: keyof OrganizationSettings, 
    value: any, 
    updatedBy: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, this.documentId);
      await updateDoc(docRef, {
        [key]: value,
        updatedAt: serverTimestamp(),
        updatedBy
      });
    } catch (error) {
      console.error('Error updating organization setting:', error);
      throw error;
    }
  }
}

export const organizationSettingsService = new OrganizationSettingsService();
