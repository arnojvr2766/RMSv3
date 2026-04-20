import { useCallback } from 'react';
import { useOrganizationSettings } from '../contexts/OrganizationSettingsContext';
import { useRole } from '../contexts/RoleContext';
import { paymentScheduleService, type PaymentSchedule } from '../services/firebaseService';
import { roomStatusHistoryService } from '../services/roomStatusHistoryService';

export interface PaymentDateValidation {
  isValid: boolean;
  requiresApproval: boolean;
  errorMessage?: string;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates if a payment date is allowed based on user role and settings
 */
export const validatePaymentDate = (
  paymentDate: Date,
  allowStandardUserPastPayments: boolean,
  requireAdminApprovalForPastPayments: boolean,
  maxPastPaymentDays: number,
  isSystemAdmin: boolean
): PaymentDateValidation => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  const paymentDateOnly = new Date(paymentDate);
  paymentDateOnly.setHours(0, 0, 0, 0); // Reset time to start of day
  
  // System admins can always capture payments with any date
  if (isSystemAdmin) {
    return {
      isValid: true,
      requiresApproval: false
    };
  }
  
  // Check if payment date is in the future
  if (paymentDateOnly > today) {
    return {
      isValid: false,
      requiresApproval: false,
      errorMessage: 'Payment date cannot be in the future'
    };
  }
  
  // Check if payment date is in the past
  if (paymentDateOnly < today) {
    // Check if standard users are allowed to capture past payments
    if (!allowStandardUserPastPayments) {
      return {
        isValid: false,
        requiresApproval: false,
        errorMessage: 'Standard users are not allowed to capture payments with past dates'
      };
    }
    
    // Calculate days difference
    const daysDifference = Math.floor((today.getTime() - paymentDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if it's within the allowed range
    if (daysDifference > maxPastPaymentDays) {
      return {
        isValid: false,
        requiresApproval: false,
        errorMessage: `Payment date cannot be more than ${maxPastPaymentDays} days in the past`
      };
    }
    
    // If we get here, the past payment is valid but may require approval
    return {
      isValid: true,
      requiresApproval: requireAdminApprovalForPastPayments
    };
  }
  
  // Payment date is today - always valid
  return {
    isValid: true,
    requiresApproval: false
  };
};

/**
 * Hook to get payment validation for current user
 */
export const usePaymentValidation = () => {
  const { 
    allowStandardUserPastPayments, 
    requireAdminApprovalForPastPayments, 
    maxPastPaymentDays 
  } = useOrganizationSettings();
  const { isSystemAdmin } = useRole();
  
  const validatePayment = useCallback((paymentDate: Date): PaymentDateValidation => {
    return validatePaymentDate(
      paymentDate,
      allowStandardUserPastPayments,
      requireAdminApprovalForPastPayments,
      maxPastPaymentDays,
      isSystemAdmin
    );
  }, [allowStandardUserPastPayments, requireAdminApprovalForPastPayments, maxPastPaymentDays, isSystemAdmin]);
  
  return { validatePayment };
};

/**
 * Validate that only one payment per month per room exists (unless partial payments allowed)
 */
export async function validateOnePaymentPerMonth(
  scheduleId: string,
  monthKey: string,
  allowPartialPayments: boolean
): Promise<PaymentValidationResult> {
  try {
    const schedule = await paymentScheduleService.getPaymentScheduleById(scheduleId);
    if (!schedule) {
      return {
        isValid: false,
        errorMessage: 'Payment schedule not found',
      };
    }

    const existingPayment = schedule.payments.find(p => p.month === monthKey);
    
    if (!existingPayment) {
      // No payment for this month yet, valid
      return { isValid: true };
    }

    // Check payment status - allow capturing/updating pending and partial payments
    // Block only if payment is already fully paid
    if (existingPayment.status === 'paid') {
      // Already fully paid - check if partial payments are allowed
      if (allowPartialPayments) {
        return {
          isValid: false,
          errorMessage: `A payment for ${monthKey} already exists with status 'paid'. Partial payments are allowed, but cannot add another payment to an already fully paid month.`,
        };
      } else {
        return {
          isValid: false,
          errorMessage: `A payment for ${monthKey} already exists with status 'paid'. Only one payment per month is allowed.`,
        };
      }
    }

    // Payment is 'pending' or 'partial' - allow capturing/updating
    // This is valid whether partial payments are allowed or not
    // (pending payments need to be captured, partial payments can be completed)
    if (existingPayment.status === 'pending' || existingPayment.status === 'partial') {
      return { isValid: true };
    }

    // For any other status (shouldn't happen, but just in case)
    return { isValid: true };
  } catch (error) {
    console.error('Error validating one payment per month:', error);
    return {
      isValid: false,
      errorMessage: 'Error checking existing payments',
    };
  }
}

/**
 * Validate that deposit is taken before rent if room was Empty last month
 */
export async function validateDepositBeforeRent(
  roomId: string,
  scheduleId: string,
  paymentType: 'rent' | 'deposit' | 'late_fee' | 'deposit_payout' | 'maintenance'
): Promise<PaymentValidationResult> {
  try {
    // Only validate for rent payments
    if (paymentType !== 'rent') {
      return { isValid: true };
    }

    // Get last month's room status
    const lastMonthStatus = await roomStatusHistoryService.getLastMonthStatus(roomId);
    
    if (lastMonthStatus === 'empty') {
      // Check if deposit has been paid in the payment schedule
      const schedule = await paymentScheduleService.getPaymentScheduleById(scheduleId);
      if (!schedule) {
        return {
          isValid: false,
          errorMessage: 'Payment schedule not found',
        };
      }

      // Look for a deposit payment that is paid
      const depositPayment = schedule.payments.find(
        p => p.type === 'deposit' && (p.status === 'paid' || p.paidAmount && p.paidAmount > 0)
      );

      if (!depositPayment || depositPayment.status !== 'paid') {
        return {
          isValid: false,
          errorMessage: 'Room was Empty last month. Deposit must be taken before rent can be accepted.',
        };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating deposit before rent:', error);
    return {
      isValid: false,
      errorMessage: 'Error checking deposit requirement',
    };
  }
}

/**
 * Validate that outstanding rent from previous month is settled before new month rent
 */
export async function validateOutstandingRent(
  scheduleId: string,
  currentMonthKey: string // Format: "YYYY-MM"
): Promise<PaymentValidationResult> {
  try {
    const schedule = await paymentScheduleService.getPaymentScheduleById(scheduleId);
    if (!schedule) {
      return {
        isValid: false,
        errorMessage: 'Payment schedule not found',
      };
    }

    // Parse current month to find previous month
    const [currentYear, currentMonth] = currentMonthKey.split('-').map(Number);
    let previousYear = currentYear;
    let previousMonth = currentMonth - 1;

    if (previousMonth < 1) {
      previousMonth = 12;
      previousYear = currentYear - 1;
    }

    const previousMonthKey = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;

    // Find previous month's payment
    const previousPayment = schedule.payments.find(p => p.month === previousMonthKey);
    
    if (previousPayment) {
      // Check if previous month is fully paid
      if (previousPayment.status === 'pending' || previousPayment.status === 'overdue' || previousPayment.status === 'partial') {
        const outstandingAmount = (previousPayment.amount || 0) - (previousPayment.paidAmount || 0);
        
        if (outstandingAmount > 0) {
          return {
            isValid: false,
            errorMessage: `Outstanding rent of R${outstandingAmount.toFixed(2)} exists from ${previousMonthKey}. Previous month must be settled before new month rent can be taken.`,
          };
        }
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Error validating outstanding rent:', error);
    return {
      isValid: false,
      errorMessage: 'Error checking outstanding rent',
    };
  }
}
