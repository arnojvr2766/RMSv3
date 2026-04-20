import { Timestamp } from 'firebase/firestore';
import { leaseService, type LeaseAgreement } from './firebaseService';
import { userService } from './userService';
import { notificationService } from './notificationService';

/**
 * Service for managing lease expiry reminders
 */
export const leaseReminderService = {
  /**
   * Calculate reminder dates for a lease
   * Returns 4 dates: 1 month before, then weekly until expiry
   */
  calculateReminderDates(endDate: Date): Date[] {
    const reminders: Date[] = [];
    
    // 1 month before expiry
    const oneMonthBefore = new Date(endDate);
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
    reminders.push(oneMonthBefore);

    // Then weekly reminders (3 more = 4 total)
    let currentDate = new Date(oneMonthBefore);
    for (let i = 0; i < 3; i++) {
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 7);
      
      // Don't add reminders past the expiry date
      if (currentDate <= endDate) {
        reminders.push(new Date(currentDate));
      }
    }

    return reminders.sort((a, b) => a.getTime() - b.getTime());
  },

  /**
   * Check if a reminder should be sent today for a lease
   */
  shouldSendReminder(lease: LeaseAgreement, today: Date = new Date()): boolean {
    if (lease.status !== 'active') {
      return false;
    }

    const endDate = lease.terms.endDate.toDate();
    const reminders = this.calculateReminderDates(endDate);

    // Check if today matches any reminder date
    return reminders.some(reminderDate => {
      return (
        reminderDate.getFullYear() === today.getFullYear() &&
        reminderDate.getMonth() === today.getMonth() &&
        reminderDate.getDate() === today.getDate()
      );
    });
  },

  /**
   * Create reminder notifications for a lease
   * Creates notifications for both system admin and standard user
   */
  async createReminderNotifications(lease: LeaseAgreement): Promise<void> {
    try {
      const endDate = lease.terms.endDate.toDate();
      const daysUntilExpiry = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      // Get all users (we'll send to system admin and standard users)
      // Filter to only active system_admin and standard_user
      const allUsers = await userService.getAllUsers();
      const relevantUsers = allUsers.filter(
        u => (u.role === 'system_admin' || u.role === 'standard_user') && u.status === 'active'
      );
      
      // Get renter info for notification message
      // Note: We'd need to fetch renter info here, but for now using lease ID
      const title = `Lease Expiry Reminder`;
      const message = daysUntilExpiry === 1 
        ? `Lease expires tomorrow. Please take action.`
        : `Lease expires in ${daysUntilExpiry} days. Please review and take action.`;

      // Create notifications for system admin and standard users
      const notificationPromises = relevantUsers.map(user =>
        notificationService.createNotification({
          userId: user.id,
          type: 'lease_expiry',
          title,
          message,
          relatedId: lease.id,
          read: false,
          expiresAt: Timestamp.fromDate(endDate),
          actionUrl: `/leases?leaseId=${lease.id}`,
        })
      );

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error creating reminder notifications:', error);
      throw error;
    }
  },

  /**
   * Get all leases that need reminders today
   */
  async getLeasesNeedingReminders(): Promise<LeaseAgreement[]> {
    try {
      const allLeases = await leaseService.getAllLeases();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return allLeases.filter(lease => this.shouldSendReminder(lease, today));
    } catch (error) {
      console.error('Error getting leases needing reminders:', error);
      throw error;
    }
  },
};

