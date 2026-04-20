import { Timestamp } from 'firebase/firestore';
import { roomService, type Room } from './firebaseService';

export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'unavailable' | 'locked' | 'empty';

/**
 * Service for managing room status history and transitions
 */
export const roomStatusHistoryService = {
  /**
   * Update room status with history tracking
   */
  async updateRoomStatus(
    roomId: string,
    newStatus: RoomStatus,
    lastOccupancyState?: 'locked' | 'empty'
  ): Promise<void> {
    try {
      const room = await roomService.getRoomById(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Validate status transition
      const currentStatus = room.status;
      if (!isValidStatusTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Prepare update data
      const updateData: Partial<Room> = {
        status: newStatus,
        updatedAt: Timestamp.now(),
      };

      // If setting to locked or empty, also set lastOccupancyState
      if (newStatus === 'locked' || newStatus === 'empty') {
        updateData.lastOccupancyState = newStatus;
      }

      // Update last month status if month has changed (called monthly by scheduled function)
      // For now, we'll update it manually when needed
      
      await roomService.updateRoom(roomId, updateData);
    } catch (error) {
      console.error('Error updating room status:', error);
      throw error;
    }
  },

  /**
   * Get last month's status for a room
   */
  async getLastMonthStatus(roomId: string): Promise<RoomStatus | null> {
    try {
      const room = await roomService.getRoomById(roomId);
      if (!room) {
        return null;
      }

      // Return lastMonthStatus if available, otherwise return current status as fallback
      return (room.lastMonthStatus || room.status) as RoomStatus;
    } catch (error) {
      console.error('Error getting last month status:', error);
      return null;
    }
  },

  /**
   * Record monthly status snapshot (called by scheduled function)
   * This would be called monthly to capture the status at the start of each month
   */
  async recordMonthlyStatusSnapshot(roomId: string): Promise<void> {
    try {
      const room = await roomService.getRoomById(roomId);
      if (!room) {
        return;
      }

      // Update lastMonthStatus with current status
      await roomService.updateRoom(roomId, {
        lastMonthStatus: room.status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error recording monthly status snapshot:', error);
      throw error;
    }
  },
};

/**
 * Validate if a status transition is allowed
 */
function isValidStatusTransition(
  currentStatus: RoomStatus,
  newStatus: RoomStatus
): boolean {
  // Define allowed transitions
  const allowedTransitions: Record<RoomStatus, RoomStatus[]> = {
    'available': ['occupied', 'maintenance', 'unavailable', 'locked', 'empty'],
    'occupied': ['available', 'maintenance', 'unavailable', 'locked', 'empty'], // Can transition to locked/empty during occupancy check
    'maintenance': ['available', 'occupied', 'unavailable', 'locked', 'empty'],
    'unavailable': ['available', 'occupied', 'maintenance', 'locked', 'empty'],
    'locked': ['occupied', 'available'], // Can transition to occupied after payment
    'empty': ['occupied', 'available'], // Can transition to occupied after deposit
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Check if status transition requires admin approval
 */
export function requiresAdminApproval(
  currentStatus: RoomStatus,
  newStatus: RoomStatus
): boolean {
  // Admin-only transitions
  const adminOnlyTransitions = [
    { from: 'available', to: 'unavailable' },
    { from: 'occupied', to: 'unavailable' },
    { from: 'maintenance', to: 'unavailable' },
  ];

  return adminOnlyTransitions.some(
    transition => transition.from === currentStatus && transition.to === newStatus
  );
}

