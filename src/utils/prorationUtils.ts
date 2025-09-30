/**
 * Proration utilities for calculating partial month rent
 */

export interface ProrationResult {
  proratedAmount: number;
  daysInMonth: number;
  daysOccupied: number;
  dailyRate: number;
  isProrated: boolean;
}

/**
 * Calculate prorated rent for a partial month
 * @param monthlyRent - The full monthly rent amount
 * @param startDate - The lease start date
 * @param endDate - The lease end date (optional, for last month calculation)
 * @param isFirstMonth - Whether this is the first month of the lease
 * @param isLastMonth - Whether this is the last month of the lease
 * @returns ProrationResult with calculated amounts and details
 */
export function calculateProratedRent(
  monthlyRent: number,
  startDate: Date,
  endDate?: Date,
  isFirstMonth: boolean = false,
  isLastMonth: boolean = false
): ProrationResult {
  const targetDate = isFirstMonth ? startDate : endDate!;
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  // Get the number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Calculate daily rate
  const dailyRate = monthlyRent / daysInMonth;
  
  let daysOccupied: number;
  
  if (isFirstMonth) {
    // For first month: count days from start date to end of month
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    daysOccupied = lastDayOfMonth - startDate.getDate() + 1;
  } else if (isLastMonth) {
    // For last month: count days from start of month to end date
    daysOccupied = endDate!.getDate();
  } else {
    // Full month
    daysOccupied = daysInMonth;
  }
  
  // Calculate prorated amount
  const proratedAmount = Math.round(dailyRate * daysOccupied * 100) / 100; // Round to 2 decimal places
  
  return {
    proratedAmount,
    daysInMonth,
    daysOccupied,
    dailyRate: Math.round(dailyRate * 100) / 100,
    isProrated: daysOccupied !== daysInMonth
  };
}

/**
 * Check if a lease has partial months that need proration
 * @param startDate - Lease start date
 * @param endDate - Lease end date
 * @returns Object indicating if first/last months need proration
 */
export function checkProrationNeeded(startDate: Date, endDate: Date): {
  firstMonthNeedsProration: boolean;
  lastMonthNeedsProration: boolean;
  firstMonthStartDay: number;
  lastMonthEndDay: number;
} {
  const firstMonthStartDay = startDate.getDate();
  const lastMonthEndDay = endDate.getDate();
  
  // First month needs proration if lease doesn't start on the 1st
  const firstMonthNeedsProration = firstMonthStartDay !== 1;
  
  // Last month needs proration if lease doesn't end on the last day of the month
  const lastDayOfLastMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
  const lastMonthNeedsProration = lastMonthEndDay !== lastDayOfLastMonth;
  
  return {
    firstMonthNeedsProration,
    lastMonthNeedsProration,
    firstMonthStartDay,
    lastMonthEndDay
  };
}

/**
 * Generate a description of the proration for display purposes
 * @param prorationResult - Result from calculateProratedRent
 * @param isFirstMonth - Whether this is the first month
 * @param isLastMonth - Whether this is the last month
 * @returns Human-readable description
 */
export function getProrationDescription(
  prorationResult: ProrationResult,
  isFirstMonth: boolean = false,
  isLastMonth: boolean = false
): string {
  if (!prorationResult.isProrated) {
    return 'Full month rent';
  }
  
  const monthType = isFirstMonth ? 'first' : isLastMonth ? 'last' : 'partial';
  return `${monthType.charAt(0).toUpperCase() + monthType.slice(1)} month: ${prorationResult.daysOccupied}/${prorationResult.daysInMonth} days (R${prorationResult.proratedAmount})`;
}

/**
 * Calculate total prorated amount for a lease period
 * @param monthlyRent - Monthly rent amount
 * @param startDate - Lease start date
 * @param endDate - Lease end date
 * @returns Total amount including prorated months
 */
export function calculateTotalProratedAmount(
  monthlyRent: number,
  startDate: Date,
  endDate: Date
): {
  totalAmount: number;
  breakdown: {
    firstMonth?: ProrationResult;
    fullMonths: number;
    lastMonth?: ProrationResult;
    fullMonthsAmount: number;
  };
} {
  const prorationCheck = checkProrationNeeded(startDate, endDate);
  
  let totalAmount = 0;
  const breakdown: any = {
    fullMonths: 0,
    fullMonthsAmount: 0
  };
  
  // Calculate first month if prorated
  if (prorationCheck.firstMonthNeedsProration) {
    breakdown.firstMonth = calculateProratedRent(monthlyRent, startDate, undefined, true, false);
    totalAmount += breakdown.firstMonth.proratedAmount;
  }
  
  // Calculate last month if prorated
  if (prorationCheck.lastMonthNeedsProration) {
    breakdown.lastMonth = calculateProratedRent(monthlyRent, startDate, endDate, false, true);
    totalAmount += breakdown.lastMonth.proratedAmount;
  }
  
  // Calculate full months
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();
  
  // Count full months between start and end
  let currentDate = new Date(startYear, startMonth, 1);
  const endDateFirst = new Date(endYear, endMonth, 1);
  
  while (currentDate < endDateFirst) {
    // Skip first month if it's prorated
    if (currentDate.getMonth() === startMonth && currentDate.getFullYear() === startYear && prorationCheck.firstMonthNeedsProration) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      continue;
    }
    
    // Skip last month if it's prorated
    if (currentDate.getMonth() === endMonth && currentDate.getFullYear() === endYear && prorationCheck.lastMonthNeedsProration) {
      break;
    }
    
    breakdown.fullMonths++;
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  breakdown.fullMonthsAmount = breakdown.fullMonths * monthlyRent;
  totalAmount += breakdown.fullMonthsAmount;
  
  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    breakdown
  };
}
