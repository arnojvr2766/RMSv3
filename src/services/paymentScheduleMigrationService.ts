import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface MigrationResult {
  totalSchedules: number;
  updatedSchedules: number;
  errors: string[];
}

/**
 * Service to migrate existing payment schedules to include the paymentDueDateSetting field
 */
export const paymentScheduleMigrationService = {
  /**
   * Add paymentDueDateSetting field to all existing payment schedules
   * @param defaultSetting - The default setting to use for existing schedules
   * @returns Promise with migration results
   */
  async addPaymentDueDateSettingField(defaultSetting: 'first_day' | 'last_day' = 'first_day'): Promise<MigrationResult> {
    try {
      console.log(`Adding paymentDueDateSetting field to existing payment schedules with default: ${defaultSetting}...`);
      
      const result: MigrationResult = {
        totalSchedules: 0,
        updatedSchedules: 0,
        errors: []
      };

      // Get all payment schedules
      const schedulesSnapshot = await getDocs(collection(db, 'payment_schedules'));
      result.totalSchedules = schedulesSnapshot.docs.length;

      if (result.totalSchedules === 0) {
        console.log('No payment schedules found to migrate');
        return result;
      }

      // Process in batches to avoid Firestore limits
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < schedulesSnapshot.docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = schedulesSnapshot.docs.slice(i, i + batchSize);
        
        for (const scheduleDoc of batchDocs) {
          try {
            const schedule = scheduleDoc.data();
            
            // Check if the field already exists
            if (schedule.paymentDueDateSetting !== undefined) {
              console.log(`Schedule ${scheduleDoc.id} already has paymentDueDateSetting field`);
              continue;
            }

            // Add the field with the default value
            batch.update(doc(db, 'payment_schedules', scheduleDoc.id), {
              paymentDueDateSetting: defaultSetting,
              updatedAt: Timestamp.now(),
            });
            
            result.updatedSchedules++;
            console.log(`Added paymentDueDateSetting field to schedule ${scheduleDoc.id}`);
          } catch (error) {
            const errorMsg = `Error updating schedule ${scheduleDoc.id}: ${error}`;
            console.error(errorMsg);
            result.errors.push(errorMsg);
          }
        }
        
        batches.push(batch);
      }

      // Execute all batches
      for (const batch of batches) {
        await batch.commit();
      }

      console.log(`Payment schedule migration completed:`, result);
      return result;
    } catch (error) {
      console.error('Error migrating payment schedules:', error);
      throw error;
    }
  },

  /**
   * Check if migration is needed
   * @returns Promise indicating if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      const schedulesSnapshot = await getDocs(collection(db, 'payment_schedules'));
      
      for (const scheduleDoc of schedulesSnapshot.docs) {
        const schedule = scheduleDoc.data();
        if (schedule.paymentDueDateSetting === undefined) {
          return true; // At least one schedule needs migration
        }
      }
      
      return false; // All schedules have the field
    } catch (error) {
      console.error('Error checking migration status:', error);
      throw error;
    }
  }
};
