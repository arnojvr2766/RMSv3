import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type Inspection, type InspectionChecklistItem } from './firebaseService';

class InspectionService {
  private collectionName = 'inspections';

  /**
   * Create a new inspection
   */
  async createInspection(inspectionData: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Calculate total repair cost from checklist items
      const totalRepairCost = inspectionData.checklistItems.reduce(
        (sum, item) => sum + (item.repairCost || 0),
        0
      );

      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...inspectionData,
        totalRepairCost,
        status: 'completed',
        createdAt: now,
        updatedAt: now,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating inspection:', error);
      throw error;
    }
  }

  /**
   * Get inspection by ID
   */
  async getInspectionById(inspectionId: string): Promise<Inspection | null> {
    try {
      const docRef = doc(db, this.collectionName, inspectionId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Inspection;
    } catch (error) {
      console.error('Error getting inspection:', error);
      throw error;
    }
  }

  /**
   * Get inspections by lease ID
   */
  async getInspectionsByLease(leaseId: string): Promise<Inspection[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('leaseId', '==', leaseId),
        orderBy('inspectionDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Inspection[];
    } catch (error) {
      console.error('Error getting inspections by lease:', error);
      throw error;
    }
  }

  /**
   * Get post-inspection for a lease (required for deposit refund)
   */
  async getPostInspectionByLease(leaseId: string): Promise<Inspection | null> {
    try {
      const inspections = await this.getInspectionsByLease(leaseId);
      const postInspection = inspections.find(inspection => inspection.type === 'post');
      return postInspection || null;
    } catch (error) {
      console.error('Error getting post-inspection:', error);
      throw error;
    }
  }

  /**
   * Update an inspection
   */
  async updateInspection(
    inspectionId: string,
    updates: Partial<Omit<Inspection, 'id' | 'createdAt'>> & {
      checklistItems?: InspectionChecklistItem[];
    }
  ): Promise<void> {
    try {
      const inspectionRef = doc(db, this.collectionName, inspectionId);
      
      // If checklist items are updated, recalculate total repair cost
      if (updates.checklistItems) {
        const totalRepairCost = updates.checklistItems.reduce(
          (sum, item) => sum + (item.repairCost || 0),
          0
        );
        updates.totalRepairCost = totalRepairCost;
      }

      await updateDoc(inspectionRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating inspection:', error);
      throw error;
    }
  }

  /**
   * Delete an inspection
   */
  async deleteInspection(inspectionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, inspectionId));
    } catch (error) {
      console.error('Error deleting inspection:', error);
      throw error;
    }
  }

  /**
   * Check if a post-inspection exists for a lease (required before deposit refund)
   */
  async hasPostInspection(leaseId: string): Promise<boolean> {
    try {
      const postInspection = await this.getPostInspectionByLease(leaseId);
      return postInspection !== null;
    } catch (error) {
      console.error('Error checking post-inspection:', error);
      return false;
    }
  }

  /**
   * Get default inspection checklist template
   * Based on client-provided inspection sheet template
   */
  getDefaultChecklist(): InspectionChecklistItem[] {
    return [
      // SECTION 1: Room Inside
      { id: '1', section: 'Room Inside', itemNumber: 1, itemName: 'Are the room walls clean and newly painted?', condition: 'yes', repairCost: 0 },
      { id: '2', section: 'Room Inside', itemNumber: 2, itemName: 'Are there holes in the walls?', condition: 'yes', repairCost: 0 },
      { id: '3', section: 'Room Inside', itemNumber: 3, itemName: 'Is the ceiling broken?', condition: 'yes', repairCost: 0 },
      { id: '4', section: 'Room Inside', itemNumber: 4, itemName: 'Is the cornice loose or broken?', condition: 'yes', repairCost: 0 },
      { id: '5', section: 'Room Inside', itemNumber: 5, itemName: 'Is the floor clean?', condition: 'yes', repairCost: 0 },
      
      // SECTION 2: Doors
      { id: '6', section: 'Doors', itemNumber: 6, itemName: 'Is the room door opening and closing?', condition: 'yes', repairCost: 0 },
      { id: '7', section: 'Doors', itemNumber: 7, itemName: 'Is the door cracked or broken?', condition: 'yes', repairCost: 0 },
      { id: '8', section: 'Doors', itemNumber: 8, itemName: 'Is the door handle working?', condition: 'yes', repairCost: 0 },
      { id: '9', section: 'Doors', itemNumber: 9, itemName: 'Does the door lock inside and out?', condition: 'yes', repairCost: 0 },
      { id: '10', section: 'Doors', itemNumber: 10, itemName: 'Is the bathroom door clean?', condition: 'yes', repairCost: 0 },
      { id: '11', section: 'Doors', itemNumber: 11, itemName: 'Is the bathroom door broken or cracked?', condition: 'yes', repairCost: 0 },
      
      // SECTION 3: Toilet / Shower / Washbasin
      { id: '12', section: 'Toilet / Shower / Washbasin', itemNumber: 12, itemName: 'Is the toilet working?', condition: 'yes', repairCost: 0 },
      { id: '13', section: 'Toilet / Shower / Washbasin', itemNumber: 13, itemName: 'Is there a toilet seat and cover?', condition: 'yes', repairCost: 0 },
      { id: '14', section: 'Toilet / Shower / Washbasin', itemNumber: 14, itemName: 'Is the toilet seat broken or cracked?', condition: 'yes', repairCost: 0 },
      { id: '15', section: 'Toilet / Shower / Washbasin', itemNumber: 15, itemName: 'Is the toilet broken or cracked?', condition: 'yes', repairCost: 0 },
      { id: '16', section: 'Toilet / Shower / Washbasin', itemNumber: 16, itemName: 'Is the waterholder broken?', condition: 'yes', repairCost: 0 },
      { id: '17', section: 'Toilet / Shower / Washbasin', itemNumber: 17, itemName: 'Is there a shower head?', condition: 'yes', repairCost: 0 },
      { id: '18', section: 'Toilet / Shower / Washbasin', itemNumber: 18, itemName: 'Is the shower head and tap broken?', condition: 'yes', repairCost: 0 },
      { id: '19', section: 'Toilet / Shower / Washbasin', itemNumber: 19, itemName: 'Is the washbasin broken or cracked?', condition: 'yes', repairCost: 0 },
      { id: '20', section: 'Toilet / Shower / Washbasin', itemNumber: 20, itemName: 'Is the tap opening and closing?', condition: 'yes', repairCost: 0 },
      { id: '21', section: 'Toilet / Shower / Washbasin', itemNumber: 21, itemName: 'Is there any leaks?', condition: 'yes', repairCost: 0 },
      
      // SECTION 4: Windows and Frames
      { id: '22', section: 'Windows and Frames', itemNumber: 22, itemName: 'Are there any windows broken or cracked?', condition: 'yes', repairCost: 0 },
      { id: '23', section: 'Windows and Frames', itemNumber: 23, itemName: 'Is the window handle and arm working?', condition: 'yes', repairCost: 0 },
      { id: '24', section: 'Windows and Frames', itemNumber: 24, itemName: 'Do the windows open and close?', condition: 'yes', repairCost: 0 },
      { id: '25', section: 'Windows and Frames', itemNumber: 25, itemName: 'Is the windows clean inside and outside?', condition: 'yes', repairCost: 0 },
      { id: '26', section: 'Windows and Frames', itemNumber: 26, itemName: 'Is the window putty in good condition?', condition: 'yes', repairCost: 0 },
      
      // SECTION 5: Lights and Plugs
      { id: '27', section: 'Lights and Plugs', itemNumber: 27, itemName: 'Are there two globes - toilet and room?', condition: 'yes', repairCost: 0 },
      { id: '28', section: 'Lights and Plugs', itemNumber: 28, itemName: 'Are the globes working?', condition: 'yes', repairCost: 0 },
      { id: '29', section: 'Lights and Plugs', itemNumber: 29, itemName: 'Are the globe holders secured to the ceiling?', condition: 'yes', repairCost: 0 },
      { id: '30', section: 'Lights and Plugs', itemNumber: 30, itemName: 'Are the light switches broken or cracked?', condition: 'yes', repairCost: 0 },
      { id: '31', section: 'Lights and Plugs', itemNumber: 31, itemName: 'Is the electrical plug working?', condition: 'yes', repairCost: 0 },
      { id: '32', section: 'Lights and Plugs', itemNumber: 32, itemName: 'Is the electrical plug secure to the wall?', condition: 'yes', repairCost: 0 },
      { id: '33', section: 'Lights and Plugs', itemNumber: 33, itemName: 'Does the electrical plug have a cover?', condition: 'yes', repairCost: 0 },
      { id: '34', section: 'Lights and Plugs', itemNumber: 34, itemName: 'Are the electrical plug box broken or cracked?', condition: 'yes', repairCost: 0 },
      { id: '35', section: 'Lights and Plugs', itemNumber: 35, itemName: 'Is the pre-paid meter working?', condition: 'yes', repairCost: 0 },
      { id: '36', section: 'Lights and Plugs', itemNumber: 36, itemName: 'Is the pre-paid meter sealed?', condition: 'yes', repairCost: 0 },
      { id: '37', section: 'Lights and Plugs', itemNumber: 37, itemName: 'Does the DB Board have a cover?', condition: 'yes', repairCost: 0 },
    ];
  }

  /**
   * Calculate deposit refund amount based on inspection
   * Formula: depositAmount - totalRepairCost
   */
  calculateDepositRefund(depositAmount: number, inspection: Inspection): number {
    return Math.max(0, depositAmount - inspection.totalRepairCost);
  }
}

export const inspectionService = new InspectionService();

