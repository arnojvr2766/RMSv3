import React, { useEffect, useState } from 'react';
import {
  Trash2,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { facilityService, roomService, type Facility, type Room } from '../../services/firebaseService';
import {
  bulkDataService,
  type DeletableEntityType,
  type SweepExtraType,
  type BulkDeleteResult,
  type BulkCreateResult,
} from '../../services/bulkDataService';

type Mode = 'delete' | 'create';
type Step = 'choose-action' | 'choose-scope' | 'preview' | 'result';

// Mirrors the server's cascade graph in functions/src/bulkDataOps.ts — kept in
// sync manually since this is just for UX (greying out auto-included items);
// the server is the source of truth and re-expands regardless of what's sent.
const CASCADE_CHILDREN: Record<DeletableEntityType, DeletableEntityType[]> = {
  renters: ['leases'],
  leases: ['payment_schedules', 'deposit_payouts', 'inspections'],
  payment_schedules: ['payment_approvals', 'penalties'],
  payment_approvals: [],
  penalties: [],
  deposit_payouts: [],
  inspections: [],
  maintenance_expenses: [],
  complaints: [],
};

const ENTITY_LABELS: Record<DeletableEntityType, string> = {
  renters: 'Renters',
  leases: 'Leases',
  payment_schedules: 'Payment Schedules',
  payment_approvals: 'Payment Approvals',
  penalties: 'Penalties',
  deposit_payouts: 'Deposit Payouts',
  maintenance_expenses: 'Maintenance Expenses',
  inspections: 'Inspections',
  complaints: 'Complaints',
};

const ENTITY_DISPLAY_ORDER: DeletableEntityType[] = [
  'renters',
  'leases',
  'payment_schedules',
  'payment_approvals',
  'penalties',
  'deposit_payouts',
  'inspections',
  'maintenance_expenses',
  'complaints',
];

const SWEEP_LABELS: Record<SweepExtraType, { label: string; caption: string }> = {
  notifications: {
    label: 'Notifications',
    caption: 'Deletes ALL notifications system-wide — not scoped to the facilities selected above.',
  },
  roomStatusHistory: {
    label: 'Room Status History',
    caption: 'Deletes the status-change log for rooms in the selected facilities.',
  },
};

function expandEntityTypes(selected: Set<DeletableEntityType>): Set<DeletableEntityType> {
  const result = new Set(selected);
  const queue = [...selected];
  while (queue.length) {
    const current = queue.shift()!;
    for (const child of CASCADE_CHILDREN[current]) {
      if (!result.has(child)) {
        result.add(child);
        queue.push(child);
      }
    }
  }
  return result;
}

const VACANT_STATUSES = new Set<Room['status']>(['available', 'empty']);

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'An unexpected error occurred.';
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const BulkDataOperations: React.FC = () => {
  const [step, setStep] = useState<Step>('choose-action');
  const [mode, setMode] = useState<Mode | null>(null);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Delete-mode scope
  const [deleteAllFacilities, setDeleteAllFacilities] = useState(true);
  const [deleteFacilityIds, setDeleteFacilityIds] = useState<Set<string>>(new Set());
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<Set<DeletableEntityType>>(new Set());
  const [sweepExtras, setSweepExtras] = useState<Set<SweepExtraType>>(new Set());
  const [confirmText, setConfirmText] = useState('');

  // Create-mode scope
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [activeFacilityTabId, setActiveFacilityTabId] = useState<string | null>(null);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [createLeaseAndSchedule, setCreateLeaseAndSchedule] = useState(false);
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');

  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<BulkDeleteResult | BulkCreateResult | null>(null);
  const [finalResult, setFinalResult] = useState<BulkDeleteResult | BulkCreateResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    facilityService
      .getFacilities()
      .then((data) => {
        if (!cancelled) setFacilities(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingFacilities(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch every facility's rooms once on entering create mode — facilities are
  // now tabs, not a filterable scope, so there's no need to re-fetch per selection.
  useEffect(() => {
    if (mode !== 'create' || facilities.length === 0) return;
    let cancelled = false;
    setLoadingRooms(true);
    Promise.all(facilities.map((f) => roomService.getRoomsByFacility(f.id!)))
      .then((results) => {
        if (cancelled) return;
        const allRooms = results.flat();
        setRooms(allRooms);
        // Default to the first facility that actually has a vacant room, so the
        // wizard doesn't land on an "all occupied" facility with nothing to pick.
        const firstVacantRoom = allRooms.find((r) => VACANT_STATUSES.has(r.status));
        setActiveFacilityTabId((prev) => prev ?? firstVacantRoom?.facilityId ?? allRooms[0]?.facilityId ?? null);
      })
      .catch((err) => {
        if (!cancelled) setActionError(extractErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoadingRooms(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, facilities]);

  // Default the lease term to "1st of this month -> Dec 31 this year" the first
  // time the admin opts into creating a lease, without clobbering later edits.
  useEffect(() => {
    if (!createLeaseAndSchedule || leaseStartDate) return;
    const now = new Date();
    setLeaseStartDate(formatDate(new Date(now.getFullYear(), now.getMonth(), 1)));
    setLeaseEndDate(formatDate(new Date(now.getFullYear(), 11, 31)));
  }, [createLeaseAndSchedule, leaseStartDate]);

  function resetAll() {
    setStep('choose-action');
    setMode(null);
    setDeleteAllFacilities(true);
    setDeleteFacilityIds(new Set());
    setSelectedEntityTypes(new Set());
    setSweepExtras(new Set());
    setConfirmText('');
    setRooms([]);
    setSelectedRoomIds(new Set());
    setActiveFacilityTabId(null);
    setRoomSearchQuery('');
    setCreateLeaseAndSchedule(false);
    setLeaseStartDate('');
    setLeaseEndDate('');
    setActionError(null);
    setPreviewResult(null);
    setFinalResult(null);
  }

  function toggleInSet<T>(set: Set<T>, value: T, setter: (next: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function toggleEntityType(type: DeletableEntityType, isImplied: boolean) {
    if (isImplied) return; // implied selections can only be removed by unchecking their parent
    toggleInSet(selectedEntityTypes, type, setSelectedEntityTypes);
  }

  const effectiveEntityTypes = expandEntityTypes(selectedEntityTypes);

  async function handlePreview() {
    setActionError(null);
    setIsBusy(true);
    try {
      if (mode === 'delete') {
        const result = await bulkDataService.previewDelete({
          scope: deleteAllFacilities ? {} : { facilityIds: Array.from(deleteFacilityIds) },
          entityTypes: Array.from(selectedEntityTypes),
          sweepExtras: Array.from(sweepExtras),
        });
        setPreviewResult(result);
      } else {
        const result = await bulkDataService.previewCreate({
          roomIds: Array.from(selectedRoomIds),
          createLeaseAndSchedule,
          ...(createLeaseAndSchedule ? { leaseStartDate, leaseEndDate } : {}),
        });
        setPreviewResult(result);
      }
      setStep('preview');
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirm() {
    setActionError(null);
    setIsBusy(true);
    try {
      if (mode === 'delete') {
        const result = await bulkDataService.executeDelete({
          scope: deleteAllFacilities ? {} : { facilityIds: Array.from(deleteFacilityIds) },
          entityTypes: Array.from(selectedEntityTypes),
          sweepExtras: Array.from(sweepExtras),
        });
        setFinalResult(result);
      } else {
        const result = await bulkDataService.executeCreate({
          roomIds: Array.from(selectedRoomIds),
          createLeaseAndSchedule,
          ...(createLeaseAndSchedule ? { leaseStartDate, leaseEndDate } : {}),
        });
        setFinalResult(result);
      }
      setStep('result');
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  if (loadingFacilities) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading facilities...
      </div>
    );
  }

  if (loadError) {
    return <p className="text-red-400 text-sm">Failed to load facilities: {loadError}</p>;
  }

  return (
    <div className="space-y-4">
      {step === 'choose-action' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setMode('delete');
              setStep('choose-scope');
            }}
            className="text-left bg-gray-800 hover:bg-gray-750 border border-gray-600 hover:border-red-500/50 rounded-lg p-6 transition-colors"
          >
            <Trash2 className="w-8 h-8 text-red-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Delete Tenant Data</h3>
            <p className="text-gray-400 text-sm">
              Bulk-delete renters, leases, payments, and related records for one or more facilities.
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('create');
              setStep('choose-scope');
            }}
            className="text-left bg-gray-800 hover:bg-gray-750 border border-gray-600 hover:border-green-500/50 rounded-lg p-6 transition-colors"
          >
            <UserPlus className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Create Placeholder Renters</h3>
            <p className="text-gray-400 text-sm">
              Fill vacant rooms with clearly-flagged placeholder renters so staff can start a lease right away.
            </p>
          </button>
        </div>
      )}

      {step === 'choose-scope' && mode === 'delete' && (
        <div className="space-y-6">
          <FacilitySelector
            facilities={facilities}
            allSelected={deleteAllFacilities}
            selectedIds={deleteFacilityIds}
            onAllToggle={setDeleteAllFacilities}
            onIdsChange={setDeleteFacilityIds}
          />

          <div>
            <h4 className="text-white font-medium mb-2">What do you want to delete?</h4>
            <p className="text-gray-500 text-xs mb-3">
              Selecting an item automatically includes everything that depends on it (shown greyed below).
            </p>
            <div className="space-y-2">
              {ENTITY_DISPLAY_ORDER.map((type) => {
                const isExplicit = selectedEntityTypes.has(type);
                const isImplied = !isExplicit && effectiveEntityTypes.has(type);
                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 text-sm ${
                      isImplied ? 'text-gray-500' : 'text-gray-200 cursor-pointer'
                    }`}
                    title={isImplied ? 'Included automatically because a related item above is selected' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={isExplicit || isImplied}
                      disabled={isImplied}
                      onChange={() => toggleEntityType(type, isImplied)}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                    {ENTITY_LABELS[type]}
                    {isImplied && <span className="text-xs text-gray-600">(required by selection above)</span>}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-medium mb-1">Also sweep (not tied to your selection above)</h4>
            <div className="space-y-2 mt-2">
              {(Object.keys(SWEEP_LABELS) as SweepExtraType[]).map((type) => (
                <label key={type} className="flex items-start gap-2 text-sm text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sweepExtras.has(type)}
                    onChange={() => toggleInSet(sweepExtras, type, setSweepExtras)}
                    className="rounded border-gray-600 bg-gray-700 mt-0.5"
                  />
                  <span>
                    {SWEEP_LABELS[type].label}
                    <span className="block text-xs text-gray-500">{SWEEP_LABELS[type].caption}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {actionError && <p className="text-red-400 text-sm">{actionError}</p>}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep('choose-action')}>
              <ChevronLeft className="w-4 h-4 mr-1 inline" /> Back
            </Button>
            <Button
              variant="danger"
              onClick={handlePreview}
              disabled={
                isBusy ||
                selectedEntityTypes.size === 0 ||
                (!deleteAllFacilities && deleteFacilityIds.size === 0)
              }
            >
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 inline animate-spin" /> : null}
              Preview Deletion <ChevronRight className="w-4 h-4 ml-1 inline" />
            </Button>
          </div>
        </div>
      )}

      {step === 'choose-scope' && mode === 'create' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-white font-medium mb-1">What should be created?</h4>
            <div className="space-y-2 mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="create-scope"
                  checked={!createLeaseAndSchedule}
                  onChange={() => setCreateLeaseAndSchedule(false)}
                  className="border-gray-600 bg-gray-700"
                />
                Renter record only
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                <input
                  type="radio"
                  name="create-scope"
                  checked={createLeaseAndSchedule}
                  onChange={() => setCreateLeaseAndSchedule(true)}
                  className="border-gray-600 bg-gray-700"
                />
                Renter + active Lease + Payment Schedule{' '}
                <span className="text-xs text-gray-500">(room will show as Occupied)</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 pl-6">
                <input type="checkbox" checked disabled className="rounded border-gray-700 bg-gray-800" />
                Renter <span className="text-xs">(always included)</span>
              </label>
            </div>
          </div>

          {createLeaseAndSchedule && (
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-white font-medium mb-2">Lease term</h4>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaseStartDate}
                    onChange={(e) => setLeaseStartDate(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaseEndDate}
                    onChange={(e) => setLeaseEndDate(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-medium mb-3">Rooms</h4>
            {loadingRooms ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading rooms...
              </div>
            ) : (
              <FacilityRoomTabs
                facilities={facilities}
                rooms={rooms}
                selectedRoomIds={selectedRoomIds}
                activeFacilityId={activeFacilityTabId}
                onActiveFacilityChange={setActiveFacilityTabId}
                searchQuery={roomSearchQuery}
                onSearchChange={setRoomSearchQuery}
                onToggleRoom={(roomId) => toggleInSet(selectedRoomIds, roomId, setSelectedRoomIds)}
                onSelectAllInFacility={(facilityId) => {
                  const vacantIds = rooms
                    .filter((r) => r.facilityId === facilityId && VACANT_STATUSES.has(r.status))
                    .map((r) => r.id!);
                  setSelectedRoomIds((prev) => new Set([...prev, ...vacantIds]));
                }}
                onClearAllInFacility={(facilityId) => {
                  const facilityRoomIds = new Set(rooms.filter((r) => r.facilityId === facilityId).map((r) => r.id!));
                  setSelectedRoomIds((prev) => new Set([...prev].filter((id) => !facilityRoomIds.has(id))));
                }}
                onSelectAllVacant={() => {
                  setSelectedRoomIds(new Set(rooms.filter((r) => VACANT_STATUSES.has(r.status)).map((r) => r.id!)));
                }}
              />
            )}
          </div>

          {actionError && <p className="text-red-400 text-sm">{actionError}</p>}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep('choose-action')}>
              <ChevronLeft className="w-4 h-4 mr-1 inline" /> Back
            </Button>
            <Button
              variant="primary"
              onClick={handlePreview}
              disabled={
                isBusy ||
                loadingRooms ||
                selectedRoomIds.size === 0 ||
                (createLeaseAndSchedule && (!leaseStartDate || !leaseEndDate))
              }
            >
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 inline animate-spin" /> : null}
              Preview Creation <ChevronRight className="w-4 h-4 ml-1 inline" />
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && mode === 'delete' && previewResult && 'counts' in previewResult && (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">This will delete:</h4>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(previewResult.counts)
                  .filter(([, count]) => count > 0)
                  .map(([name, count]) => (
                    <tr key={name} className="border-b border-gray-600 last:border-0">
                      <td className="py-1.5 text-gray-300">{ENTITY_LABELS[name as DeletableEntityType] ?? name}</td>
                      <td className="py-1.5 text-right text-white font-medium">{count}</td>
                    </tr>
                  ))}
                <tr>
                  <td className="pt-2 text-gray-300 font-semibold">Total</td>
                  <td className="pt-2 text-right text-white font-bold">
                    {Object.values(previewResult.counts).reduce((a, b) => a + b, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
            {previewResult.roomsResetCount > 0 && (
              <p className="text-sm text-gray-300 mt-3 pt-3 border-t border-gray-600">
                <span className="text-white font-semibold">{previewResult.roomsResetCount}</span> occupied room(s)
                will be reset to Available.
              </p>
            )}
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-300">
              This action is permanent. A backup of everything listed above will be saved to Cloud Storage before
              deletion, but there is no in-app restore — recovering it requires a system admin retrieving the
              backup file manually.
            </div>
          </div>

          <div>
            <Input
              label='Type "DELETE" to confirm'
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>

          {actionError && <p className="text-red-400 text-sm">{actionError}</p>}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep('choose-scope')} disabled={isBusy}>
              <ChevronLeft className="w-4 h-4 mr-1 inline" /> Back
            </Button>
            <Button variant="danger" onClick={handleConfirm} disabled={isBusy || confirmText !== 'DELETE'}>
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 inline animate-spin" /> : null}
              Confirm &amp; Delete
            </Button>
          </div>
        </div>
      )}

      {step === 'preview' && mode === 'create' && previewResult && 'targetedRoomsCount' in previewResult && (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4 text-sm text-gray-200 space-y-1">
            <p>
              <span className="text-white font-semibold">{previewResult.targetedRoomsCount}</span> placeholder{' '}
              {createLeaseAndSchedule ? 'renters + active leases + payment schedules' : 'renters'} will be created
              {createLeaseAndSchedule && leaseStartDate && leaseEndDate
                ? ` (lease term: ${leaseStartDate} to ${leaseEndDate})`
                : ''}
              .
            </p>
            {previewResult.skippedNotVacantCount > 0 && (
              <p className="text-gray-400">
                {previewResult.skippedNotVacantCount} selected room(s) skipped — no longer vacant.
              </p>
            )}
            {previewResult.skippedNotFoundCount > 0 && (
              <p className="text-gray-400">
                {previewResult.skippedNotFoundCount} selected room(s) skipped — no longer exist.
              </p>
            )}
          </div>

          {actionError && <p className="text-red-400 text-sm">{actionError}</p>}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep('choose-scope')} disabled={isBusy}>
              <ChevronLeft className="w-4 h-4 mr-1 inline" /> Back
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isBusy || previewResult.targetedRoomsCount === 0}
            >
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 inline animate-spin" /> : null}
              Confirm &amp; Create
            </Button>
          </div>
        </div>
      )}

      {step === 'result' && finalResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              {mode === 'delete' ? 'Deletion complete.' : 'Placeholder creation complete.'}
            </span>
          </div>

          {mode === 'delete' && 'backupPath' in finalResult && finalResult.backupPath && (
            <div className="bg-gray-700 rounded-lg p-3 text-sm">
              <p className="text-gray-400 mb-1">Backup saved to:</p>
              <code className="text-gray-200 break-all">{finalResult.backupPath}</code>
            </div>
          )}

          {mode === 'delete' && 'counts' in finalResult && (
            <div className="text-sm text-gray-300">
              {Object.entries(finalResult.counts)
                .filter(([, c]) => c > 0)
                .map(([name, count]) => (
                  <p key={name}>
                    Deleted {count} {ENTITY_LABELS[name as DeletableEntityType] ?? name}
                  </p>
                ))}
              {finalResult.storageFilesCount > 0 && <p>Removed {finalResult.storageFilesCount} Storage file(s).</p>}
              {finalResult.roomsResetCount > 0 && (
                <p>Reset {finalResult.roomsResetCount} room(s) to Available.</p>
              )}
            </div>
          )}

          {mode === 'create' && 'createdRenterIds' in finalResult && (
            <div className="text-sm text-gray-300">
              <p>Created {finalResult.createdRenterIds.length} placeholder renter(s).</p>
              {finalResult.createdLeaseIds.length > 0 && (
                <>
                  <p>Created {finalResult.createdLeaseIds.length} active lease(s) and payment schedule(s).</p>
                  <p>Rooms with a new lease were marked Occupied.</p>
                </>
              )}
            </div>
          )}

          {finalResult.errors.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm">
              <p className="text-yellow-400 font-medium mb-2">{finalResult.errors.length} issue(s) occurred:</p>
              <ul className="space-y-1 text-gray-300">
                {finalResult.errors.map((e, i) => (
                  <li key={i}>
                    {'collection' in e ? e.collection : e.roomId}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2">
            <Button variant="secondary" onClick={resetAll}>
              <RotateCcw className="w-4 h-4 mr-2 inline" /> Start Another Operation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface FacilitySelectorProps {
  facilities: Facility[];
  allSelected: boolean;
  selectedIds: Set<string>;
  onAllToggle: (value: boolean) => void;
  onIdsChange: (ids: Set<string>) => void;
}

const FacilitySelector: React.FC<FacilitySelectorProps> = ({
  facilities,
  allSelected,
  selectedIds,
  onAllToggle,
  onIdsChange,
}) => {
  function toggleFacility(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onIdsChange(next);
  }

  return (
    <div>
      <h4 className="text-white font-medium mb-2">Which facilities?</h4>
      <label className="flex items-center gap-2 text-sm text-gray-200 mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onAllToggle(e.target.checked)}
          className="rounded border-gray-600 bg-gray-700"
        />
        All facilities
      </label>
      {!allSelected && (
        <div className="pl-6 space-y-1.5 max-h-48 overflow-y-auto">
          {facilities.map((f) => (
            <label key={f.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.has(f.id!)}
                onChange={() => toggleFacility(f.id!)}
                className="rounded border-gray-600 bg-gray-700"
              />
              {f.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

interface FacilityRoomTabsProps {
  facilities: Facility[];
  rooms: Room[];
  selectedRoomIds: Set<string>;
  activeFacilityId: string | null;
  onActiveFacilityChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleRoom: (roomId: string) => void;
  onSelectAllInFacility: (facilityId: string) => void;
  onClearAllInFacility: (facilityId: string) => void;
  onSelectAllVacant: () => void;
}

const FacilityRoomTabs: React.FC<FacilityRoomTabsProps> = ({
  facilities,
  rooms,
  selectedRoomIds,
  activeFacilityId,
  onActiveFacilityChange,
  searchQuery,
  onSearchChange,
  onToggleRoom,
  onSelectAllInFacility,
  onClearAllInFacility,
  onSelectAllVacant,
}) => {
  // Every facility with a room gets a tab — a facility must never appear to
  // vanish just because it happens to be fully occupied right now. Facilities
  // with zero vacant rooms just render a one-line "fully occupied" message
  // instead of a room grid (see below), rather than dumping 30+ disabled chips.
  const facilitiesWithRooms = facilities.filter((f) => rooms.some((r) => r.facilityId === f.id));
  const facilitiesWithVacantRooms = facilities.filter((f) =>
    rooms.some((r) => r.facilityId === f.id && VACANT_STATUSES.has(r.status))
  );

  if (facilitiesWithRooms.length === 0) {
    return <p className="text-gray-500 text-sm">No rooms found.</p>;
  }

  const totalVacant = rooms.filter((r) => VACANT_STATUSES.has(r.status)).length;
  const activeFacility =
    facilitiesWithRooms.find((f) => f.id === activeFacilityId) ?? facilitiesWithVacantRooms[0] ?? facilitiesWithRooms[0];
  const activeFacilityRooms = rooms.filter((r) => r.facilityId === activeFacility.id);
  const activeFacilityVacantRooms = activeFacilityRooms.filter((r) => VACANT_STATUSES.has(r.status));
  const hiddenInActiveFacility = activeFacilityRooms.length - activeFacilityVacantRooms.length;
  const query = searchQuery.trim().toLowerCase();
  const visibleRooms = query
    ? activeFacilityVacantRooms.filter((r) => r.roomNumber.toLowerCase().includes(query))
    : activeFacilityVacantRooms;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-300">
          <span className="text-white font-semibold">{selectedRoomIds.size}</span> of {totalVacant} vacant rooms
          selected across {facilitiesWithVacantRooms.length} of {facilitiesWithRooms.length} facilities
        </p>
        <Button variant="ghost" size="sm" onClick={onSelectAllVacant}>
          Select all vacant rooms
        </Button>
      </div>

      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto scrollbar-hide">
          {facilitiesWithRooms.map((facility) => {
            const facilityRooms = rooms.filter((r) => r.facilityId === facility.id);
            const vacantCount = facilityRooms.filter((r) => VACANT_STATUSES.has(r.status)).length;
            const selectedCount = facilityRooms.filter((r) => selectedRoomIds.has(r.id!)).length;
            const isActive = facility.id === activeFacility.id;
            return (
              <button
                key={facility.id}
                type="button"
                onClick={() => onActiveFacilityChange(facility.id!)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-primary-500 text-primary-400'
                    : vacantCount === 0
                      ? 'border-transparent text-gray-600 hover:text-gray-400 hover:border-gray-300'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {facility.name} ({selectedCount}/{vacantCount})
              </button>
            );
          })}
        </nav>
      </div>

      {activeFacilityVacantRooms.length === 0 ? (
        <p className="text-gray-500 text-sm">
          All {activeFacilityRooms.length} room(s) in this facility are occupied — nothing to select here.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search room number..."
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onSelectAllInFacility(activeFacility.id!)}>
                Select all in this facility
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onClearAllInFacility(activeFacility.id!)}>
                Clear all in this facility
              </Button>
            </div>
          </div>

          {visibleRooms.length === 0 ? (
            <p className="text-gray-500 text-sm">No rooms match your search.</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-1">
              {visibleRooms.map((room) => {
                const selected = selectedRoomIds.has(room.id!);
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onToggleRoom(room.id!)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-primary-500 text-secondary-900 border-primary-500'
                        : 'bg-green-500/20 text-green-400 border-green-500/30 hover:border-green-400'
                    }`}
                  >
                    {room.roomNumber}
                  </button>
                );
              })}
            </div>
          )}

          {hiddenInActiveFacility > 0 && !query && (
            <p className="text-xs text-gray-500">{hiddenInActiveFacility} room(s) not shown (not vacant).</p>
          )}
        </>
      )}
    </div>
  );
};

export default BulkDataOperations;
