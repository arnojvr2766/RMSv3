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
  const [createAllFacilities, setCreateAllFacilities] = useState(true);
  const [createFacilityIds, setCreateFacilityIds] = useState<Set<string>>(new Set());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [excludedRoomIds, setExcludedRoomIds] = useState<Set<string>>(new Set());
  const [createLeaseAndSchedule, setCreateLeaseAndSchedule] = useState(false);

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

  useEffect(() => {
    if (mode !== 'create') return;
    let cancelled = false;
    setLoadingRooms(true);
    const targetFacilityIds = createAllFacilities
      ? facilities.map((f) => f.id!)
      : Array.from(createFacilityIds);

    Promise.all(targetFacilityIds.map((id) => roomService.getRoomsByFacility(id)))
      .then((results) => {
        if (!cancelled) setRooms(results.flat());
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
  }, [mode, createAllFacilities, createFacilityIds, facilities]);

  function resetAll() {
    setStep('choose-action');
    setMode(null);
    setDeleteAllFacilities(true);
    setDeleteFacilityIds(new Set());
    setSelectedEntityTypes(new Set());
    setSweepExtras(new Set());
    setConfirmText('');
    setCreateAllFacilities(true);
    setCreateFacilityIds(new Set());
    setRooms([]);
    setExcludedRoomIds(new Set());
    setCreateLeaseAndSchedule(false);
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
          facilityIds: createAllFacilities ? undefined : Array.from(createFacilityIds),
          excludeRoomIds: Array.from(excludedRoomIds),
          createLeaseAndSchedule,
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
          facilityIds: createAllFacilities ? undefined : Array.from(createFacilityIds),
          excludeRoomIds: Array.from(excludedRoomIds),
          createLeaseAndSchedule,
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
          <FacilitySelector
            facilities={facilities}
            allSelected={createAllFacilities}
            selectedIds={createFacilityIds}
            onAllToggle={setCreateAllFacilities}
            onIdsChange={setCreateFacilityIds}
          />

          <div className="border-t border-gray-700 pt-4">
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
                Renter + draft Lease + Payment Schedule <span className="text-xs text-gray-500">(room will show as Occupied)</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 pl-6">
                <input type="checkbox" checked disabled className="rounded border-gray-700 bg-gray-800" />
                Renter <span className="text-xs">(always included)</span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-white font-medium mb-1">Rooms</h4>
            <p className="text-gray-500 text-xs mb-3">
              Only vacant rooms are eligible. Untick a room to exclude it from this run.
            </p>
            {loadingRooms ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading rooms...
              </div>
            ) : (
              <RoomExclusionList
                facilities={createAllFacilities ? facilities : facilities.filter((f) => createFacilityIds.has(f.id!))}
                rooms={rooms}
                excludedRoomIds={excludedRoomIds}
                onToggleRoom={(roomId) => toggleInSet(excludedRoomIds, roomId, setExcludedRoomIds)}
              />
            )}
          </div>

          {actionError && <p className="text-red-400 text-sm">{actionError}</p>}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep('choose-action')}>
              <ChevronLeft className="w-4 h-4 mr-1 inline" /> Back
            </Button>
            <Button variant="primary" onClick={handlePreview} disabled={isBusy || loadingRooms}>
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
              {createLeaseAndSchedule ? 'renters + leases + payment schedules' : 'renters'} will be created.
            </p>
            <p className="text-gray-400">{previewResult.skippedOccupiedCount} rooms skipped (already occupied).</p>
            <p className="text-gray-400">{previewResult.skippedExcludedCount} rooms excluded by your selection.</p>
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
              <p className="text-yellow-400 mt-2">
                Room statuses were not changed — reset any affected rooms to Available manually in Rooms management
                if needed.
              </p>
            </div>
          )}

          {mode === 'create' && 'createdRenterIds' in finalResult && (
            <div className="text-sm text-gray-300">
              <p>Created {finalResult.createdRenterIds.length} placeholder renter(s).</p>
              {finalResult.createdLeaseIds.length > 0 && (
                <>
                  <p>Created {finalResult.createdLeaseIds.length} draft lease(s) and payment schedule(s).</p>
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

interface RoomExclusionListProps {
  facilities: Facility[];
  rooms: Room[];
  excludedRoomIds: Set<string>;
  onToggleRoom: (roomId: string) => void;
}

const RoomExclusionList: React.FC<RoomExclusionListProps> = ({ facilities, rooms, excludedRoomIds, onToggleRoom }) => {
  if (rooms.length === 0) {
    return <p className="text-gray-500 text-sm">No rooms found for the selected facilities.</p>;
  }
  return (
    <div className="space-y-4 max-h-64 overflow-y-auto">
      {facilities.map((facility) => {
        const facilityRooms = rooms.filter((r) => r.facilityId === facility.id);
        if (facilityRooms.length === 0) return null;
        return (
          <div key={facility.id}>
            <p className="text-gray-400 text-xs font-medium mb-1">{facility.name}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
              {facilityRooms.map((room) => {
                const vacant = VACANT_STATUSES.has(room.status);
                return (
                  <label
                    key={room.id}
                    className={`flex items-center gap-2 text-sm ${
                      vacant ? 'text-gray-200 cursor-pointer' : 'text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={vacant && !excludedRoomIds.has(room.id!)}
                      disabled={!vacant}
                      onChange={() => onToggleRoom(room.id!)}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                    {room.roomNumber}
                    {!vacant && <span className="text-xs">(occupied — skipped)</span>}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BulkDataOperations;
