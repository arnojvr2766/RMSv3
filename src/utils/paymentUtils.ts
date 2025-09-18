/**
 * Utility functions for payment-related calculations
 */

/**
 * Calculate the due date for a payment based on the month and payment due date setting
 * @param year - The year (e.g., 2025)
 * @param month - The month (1-12)
 * @param paymentDueDate - Whether payments are due on first or last day of month
 * @returns Date object representing the due date
 */
export function calculatePaymentDueDate(
  year: number, 
  month: number, 
  paymentDueDate: 'first_day' | 'last_day'
): Date {
  if (paymentDueDate === 'first_day') {
    // Payment due on the 1st of the month
    return new Date(year, month - 1, 1);
  } else {
    // Payment due on the last day of the month
    return new Date(year, month, 0); // month parameter is 1-indexed, so month gives us the last day of month-1
  }
}

/**
 * Calculate the number of days a payment is overdue
 * @param dueDate - The due date of the payment
 * @param paymentDate - The actual payment date (optional, defaults to today)
 * @param gracePeriodDays - Number of grace period days (default: 2)
 * @returns Number of days overdue (negative if not overdue)
 */
export function calculateDaysOverdue(
  dueDate: Date, 
  paymentDate: Date = new Date(),
  gracePeriodDays: number = 2
): number {
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
  
  if (paymentDate <= gracePeriodEnd) {
    return 0; // Within grace period
  }
  
  const diffTime = paymentDate.getTime() - gracePeriodEnd.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if a payment is overdue
 * @param dueDate - The due date of the payment
 * @param paymentDate - The actual payment date (optional, defaults to today)
 * @param gracePeriodDays - Number of grace period days (default: 2)
 * @returns True if payment is overdue
 */
export function isPaymentOverdue(
  dueDate: Date, 
  paymentDate: Date = new Date(),
  gracePeriodDays: number = 2
): boolean {
  return calculateDaysOverdue(dueDate, paymentDate, gracePeriodDays) > 0;
}

/**
 * Format a date for display
 * @param date - The date to format
 * @returns Formatted date string (DD/MM/YYYY)
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Get the month name from a month number
 * @param month - Month number (1-12)
 * @returns Month name (e.g., "January", "February")
 */
export function getMonthName(month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month - 1];
}
