import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

export type DeletableEntityType =
  | 'renters'
  | 'leases'
  | 'payment_schedules'
  | 'payment_approvals'
  | 'penalties'
  | 'deposit_payouts'
  | 'maintenance_expenses'
  | 'inspections'
  | 'complaints';

export type SweepExtraType = 'notifications' | 'roomStatusHistory';

export interface BulkDeleteRequest {
  dryRun: boolean;
  scope?: { facilityIds?: string[] };
  entityTypes: DeletableEntityType[];
  sweepExtras?: SweepExtraType[];
}

export interface BulkDeleteResult {
  dryRun: boolean;
  counts: Record<string, number>;
  storageFilesCount: number;
  backupPath?: string;
  errors: Array<{ collection: string; message: string }>;
}

export interface BulkCreateRequest {
  dryRun: boolean;
  roomIds: string[];
  createLeaseAndSchedule: boolean;
  leaseStartDate?: string;
  leaseEndDate?: string;
}

export interface BulkCreateResult {
  dryRun: boolean;
  requestedRoomsCount: number;
  targetedRoomsCount: number;
  skippedNotVacantCount: number;
  skippedNotFoundCount: number;
  createdRenterIds: string[];
  createdLeaseIds: string[];
  createdScheduleIds: string[];
  errors: Array<{ roomId: string; message: string }>;
}

const bulkDeleteTenantDataFn = httpsCallable<BulkDeleteRequest, BulkDeleteResult>(
  functions,
  'bulkDeleteTenantData'
);
const bulkCreatePlaceholderRentersFn = httpsCallable<BulkCreateRequest, BulkCreateResult>(
  functions,
  'bulkCreatePlaceholderRenters'
);

export const bulkDataService = {
  previewDelete: (req: Omit<BulkDeleteRequest, 'dryRun'>) =>
    bulkDeleteTenantDataFn({ ...req, dryRun: true }).then((r) => r.data),
  executeDelete: (req: Omit<BulkDeleteRequest, 'dryRun'>) =>
    bulkDeleteTenantDataFn({ ...req, dryRun: false }).then((r) => r.data),
  previewCreate: (req: Omit<BulkCreateRequest, 'dryRun'>) =>
    bulkCreatePlaceholderRentersFn({ ...req, dryRun: true }).then((r) => r.data),
  executeCreate: (req: Omit<BulkCreateRequest, 'dryRun'>) =>
    bulkCreatePlaceholderRentersFn({ ...req, dryRun: false }).then((r) => r.data),
};
