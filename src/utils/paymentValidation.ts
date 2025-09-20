import { useSettings } from '../contexts/SettingsContext';
import { useRole } from '../contexts/RoleContext';

export interface PaymentDateValidation {
  isValid: boolean;
  requiresApproval: boolean;
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
  } = useSettings();
  const { isSystemAdmin } = useRole();
  
  const validatePayment = (paymentDate: Date): PaymentDateValidation => {
    return validatePaymentDate(
      paymentDate,
      allowStandardUserPastPayments,
      requireAdminApprovalForPastPayments,
      maxPastPaymentDays,
      isSystemAdmin
    );
  };
  
  return { validatePayment };
};
