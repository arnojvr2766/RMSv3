import { 
  collection, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { roomService } from './firebaseService';

interface FacilityStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  roomsWithPenalties: number;
  penaltyRate: number; // Percentage of rooms with outstanding penalties
}

export const facilityStatsService = {
  // Get statistics for a specific facility
  async getFacilityStats(facilityId: string): Promise<FacilityStats> {
    try {
      // Get all rooms for this facility
      const rooms = await roomService.getRooms(facilityId);
      
      // Calculate room statistics
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
      const availableRooms = rooms.filter(room => room.status === 'available').length;
      const maintenanceRooms = rooms.filter(room => room.status === 'maintenance').length;
      
      // Get payment schedules for this facility to check for penalties
      const schedulesQuery = query(
        collection(db, 'payment_schedules'),
        where('facilityId', '==', facilityId)
      );
      
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const schedules = schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Count rooms with outstanding penalties
      let roomsWithPenalties = 0;
      const roomIdsWithPenalties = new Set<string>();
      
      for (const schedule of schedules) {
        if (schedule.aggregatedPenalty && schedule.aggregatedPenalty.outstandingAmount > 0) {
          roomIdsWithPenalties.add(schedule.roomId);
        }
      }
      
      roomsWithPenalties = roomIdsWithPenalties.size;
      
      // Calculate penalty rate (percentage of occupied rooms with penalties)
      const penaltyRate = occupiedRooms > 0 ? (roomsWithPenalties / occupiedRooms) * 100 : 0;
      
      return {
        totalRooms,
        occupiedRooms,
        availableRooms,
        maintenanceRooms,
        roomsWithPenalties,
        penaltyRate: Math.round(penaltyRate * 10) / 10 // Round to 1 decimal place
      };
    } catch (error) {
      console.error('Error getting facility stats:', error);
      // Return default stats if there's an error
      return {
        totalRooms: 0,
        occupiedRooms: 0,
        availableRooms: 0,
        maintenanceRooms: 0,
        roomsWithPenalties: 0,
        penaltyRate: 0
      };
    }
  },

  // Get statistics for multiple facilities
  async getMultipleFacilityStats(facilityIds: string[]): Promise<Record<string, FacilityStats>> {
    const stats: Record<string, FacilityStats> = {};
    
    try {
      const promises = facilityIds.map(async (facilityId) => {
        stats[facilityId] = await this.getFacilityStats(facilityId);
      });
      
      await Promise.all(promises);
      return stats;
    } catch (error) {
      console.error('Error getting multiple facility stats:', error);
      return stats;
    }
  }
};
