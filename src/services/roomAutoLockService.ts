import { roomService, leaseService, paymentScheduleService } from './firebaseService';
import { roomStatusHistoryService } from './roomStatusHistoryService';
import { notificationService } from './notificationService';
import { userService } from './userService';
import { organizationSettingsService } from './organizationSettingsService';

/**
 * Service for automatically locking rooms when rent is overdue.
 *
 * Logic: If today > autoLockAfterDays past the 1st of the month AND the
 * current month's payment for an occupied room is still pending, lock the room
 * and notify system admins.
 */
export const roomAutoLockService = {
  /**
   * Check all occupied rooms and lock any where rent is overdue.
   * Called on login and via Firebase Scheduled Function.
   */
  async checkAndLockOverdueRooms(): Promise<{ locked: number; errors: number }> {
    let locked = 0;
    let errors = 0;

    try {
      const settings = await organizationSettingsService.getOrganizationSettings();
      const autoLockAfterDays = settings.autoLockAfterDays ?? 5;

      const today = new Date();
      const dayOfMonth = today.getDate();

      // Only run after the auto-lock threshold has passed
      if (dayOfMonth <= autoLockAfterDays) {
        return { locked, errors };
      }

      const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      // Get all occupied rooms
      const allRooms = await roomService.getAllRooms();
      const occupiedRooms = allRooms.filter(r => r.status === 'occupied');

      if (occupiedRooms.length === 0) {
        return { locked, errors };
      }

      // Get active leases
      const allLeases = await leaseService.getAllLeases();
      const activeLeases = allLeases.filter(l => l.status === 'active');

      // Build a map from roomId → lease
      const leaseByRoom = new Map(activeLeases.map(l => [l.roomId, l]));

      // Get system admins for notifications
      const allUsers = await userService.getAllUsers();
      const admins = allUsers.filter(u => u.role === 'system_admin' && u.status === 'active');

      for (const room of occupiedRooms) {
        try {
          const lease = leaseByRoom.get(room.id!);
          if (!lease) continue;

          // Get payment schedule for this lease
          const allSchedules = await paymentScheduleService.getAllPaymentSchedules();
          const schedule = allSchedules.find(s => s.leaseId === lease.id);
          if (!schedule) continue;

          // Find current month's payment
          const currentPayment = schedule.payments.find(p => p.month === currentMonth);
          if (!currentPayment) continue;

          // If payment is still pending (not paid, not partial), lock the room
          if (currentPayment.status === 'pending') {
            await roomStatusHistoryService.updateRoomStatus(room.id!, 'locked');

            // Notify system admins
            await Promise.all(admins.map(admin =>
              notificationService.createNotification({
                userId: admin.id,
                type: 'room_locked',
                title: 'Room Auto-Locked: Overdue Rent',
                message: `Room ${room.roomNumber} has been automatically locked. No payment received for ${currentMonth} (day ${dayOfMonth} of month).`,
                relatedId: room.id,
                read: false,
                actionUrl: `/rooms`,
              })
            ));

            locked++;
          }
        } catch (roomError) {
          console.error(`Error processing room ${room.roomNumber}:`, roomError);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in checkAndLockOverdueRooms:', error);
      errors++;
    }

    return { locked, errors };
  },
};
