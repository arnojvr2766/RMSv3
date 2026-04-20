import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronRight, ChevronLeft, Search, Check, Building2,
  DoorClosed, User, UserPlus, Calendar, Banknote, FileText,
  Sparkles, AlertCircle, Loader2, CheckCircle2, Phone, Mail,
  CreditCard, Hash,
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import {
  facilityService, roomService, renterService,
  leaseService, paymentScheduleService, generatePaymentSchedule,
} from '../../services/firebaseService';
import { useOrganizationSettings } from '../../contexts/OrganizationSettingsContext';
import { isValidEmail, EMAIL_ERROR } from '../../utils/emailValidation';
import PaymentCapture from './PaymentCapture';
import type { Facility, Room, Renter } from '../../types/index';

// Parse a "YYYY-MM-DD" string in local time (not UTC) to avoid off-by-one day issues
function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // noon local time — safely avoids DST edge cases
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaseTerms {
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  paymentDueDay: number;
  childrenCount: number;
  additionalTerms: string;
}

interface NewRentalWizardProps {
  onClose: () => void;
  initialRoom?: Room;
  initialFacility?: Facility;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  single: 'Single', double: 'Double', family: 'Family', studio: 'Studio',
};

const STEPS = [
  { label: 'Room', icon: DoorClosed },
  { label: 'Renter', icon: User },
  { label: 'Terms', icon: FileText },
  { label: 'Review', icon: Check },
];

// ─── Progress Header ──────────────────────────────────────────────────────────

function ProgressHeader({
  step, onClose,
}: { step: number; onClose: () => void }) {
  const pct = Math.round((step / 4) * 100);

  return (
    <div className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-6 pt-5 pb-4">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center">
            <Sparkles size={13} className="text-primary-500" />
          </div>
          <h2 className="text-white font-bold text-lg">New Rental Agreement</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-gray-700 rounded-lg"
        >
          <X size={18} />
        </button>
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-0 mb-3">
        {STEPS.map((s, i) => {
          const stepNum = i + 1;
          const done = step > stepNum;
          const active = step === stepNum;
          return (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done ? 'bg-primary-500 text-gray-900'
                    : active ? 'bg-gray-700 border-2 border-primary-500 text-primary-400'
                    : 'bg-gray-700 text-gray-500'
                }`}>
                  {done ? <Check size={12} /> : stepNum}
                </div>
                <span className={`text-xs mt-1 font-medium ${
                  active ? 'text-primary-400' : done ? 'text-primary-500' : 'text-gray-500'
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all duration-500 ${
                  step > stepNum ? 'bg-primary-500' : 'bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-primary-400 w-8 text-right">{pct}%</span>
      </div>
    </div>
  );
}

// ─── Step 1: Room Selection ───────────────────────────────────────────────────

function StepRoom({
  facilities, rooms, loading,
  selectedFacilityId, onFacilitySelect,
  selectedRoom, onRoomSelect,
}: {
  facilities: Facility[];
  rooms: Room[];
  loading: boolean;
  selectedFacilityId: string | null;
  onFacilitySelect: (id: string | null) => void;
  selectedRoom: Room | null;
  onRoomSelect: (room: Room) => void;
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const filteredRooms = rooms.filter(r => {
    const facilityMatch = !selectedFacilityId || r.facilityId === selectedFacilityId;
    const typeMatch = typeFilter === 'all' || r.type === typeFilter;
    const searchMatch = !search || r.roomNumber.toLowerCase().includes(search.toLowerCase());
    return facilityMatch && typeMatch && searchMatch;
  });

  const availableCount = filteredRooms.filter(r => r.status === 'available').length;

  const getFacilityName = (id: string) => facilities.find(f => f.id === id)?.name ?? '';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-white font-semibold text-base mb-1">Choose a Room</h3>
        <p className="text-gray-400 text-sm">Only available rooms are shown.</p>
      </div>

      {/* Facility filter chips */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Filter by Facility</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => onFacilitySelect(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              !selectedFacilityId
                ? 'bg-primary-500 text-gray-900'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {facilities.map(f => (
            <button
              key={f.id}
              onClick={() => onFacilitySelect(f.id!)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedFacilityId === f.id
                  ? 'bg-primary-500 text-gray-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search + type filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search room number…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/40"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
        >
          <option value="all">All Types</option>
          <option value="single">Single</option>
          <option value="double">Double</option>
          <option value="studio">Studio</option>
          <option value="family">Family</option>
        </select>
      </div>

      {/* Availability summary */}
      {!loading && filteredRooms.length > 0 && (
        <p className="text-xs text-gray-500">
          <span className={availableCount > 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
            {availableCount} available
          </span>
          {' '}of {filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Room grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary-500" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <DoorClosed size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No rooms found.</p>
          <p className="text-xs mt-1">Try a different facility filter or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredRooms.map(room => {
            const isAvailable = room.status === 'available';
            const selected = selectedRoom?.id === room.id;
            const STATUS_BADGE: Record<string, string> = {
              occupied: 'bg-blue-500/20 text-blue-400',
              maintenance: 'bg-yellow-500/20 text-yellow-400',
              unavailable: 'bg-gray-500/20 text-gray-400',
              locked: 'bg-orange-500/20 text-orange-400',
              empty: 'bg-purple-500/20 text-purple-400',
            };
            return (
              <button
                key={room.id}
                onClick={() => isAvailable && onRoomSelect(room)}
                disabled={!isAvailable}
                className={`relative text-left rounded-xl border p-3 transition-all ${
                  !isAvailable
                    ? 'border-gray-700/50 bg-gray-800/30 cursor-not-allowed opacity-50'
                    : selected
                    ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/10'
                    : 'border-gray-700 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                }`}
              >
                {selected && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                    <Check size={9} className="text-gray-900" />
                  </div>
                )}
                {!isAvailable && (
                  <span className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[room.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                    {room.status}
                  </span>
                )}
                <p className={`font-bold text-base ${selected ? 'text-primary-400' : isAvailable ? 'text-white' : 'text-gray-500'}`}>
                  {room.roomNumber}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{ROOM_TYPE_LABELS[room.type] ?? room.type}</p>
                <p className={`text-sm font-semibold mt-1.5 ${selected ? 'text-primary-400' : isAvailable ? 'text-white' : 'text-gray-600'}`}>
                  R{room.monthlyRent.toLocaleString()}
                </p>
                <p className="text-gray-600 text-xs">/ month</p>
                {!selectedFacilityId && (
                  <p className="text-gray-600 text-xs mt-1 truncate">{getFacilityName(room.facilityId)}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedRoom && (
        <div className="flex items-center gap-3 bg-primary-500/10 border border-primary-500/30 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
            <Check size={14} className="text-gray-900" />
          </div>
          <div className="flex-1">
            <p className="text-primary-300 font-semibold text-sm">Room {selectedRoom.roomNumber} selected</p>
            <p className="text-primary-500/70 text-xs">
              {ROOM_TYPE_LABELS[selectedRoom.type]} · R{selectedRoom.monthlyRent.toLocaleString()}/mo
              {!selectedFacilityId && ` · ${getFacilityName(selectedRoom.facilityId)}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Renter Selection ─────────────────────────────────────────────────

function StepRenter({
  allRenters, loading,
  selectedRenter, onRenterSelect, onAutoAdvance,
}: {
  allRenters: Renter[];
  loading: boolean;
  selectedRenter: Renter | null;
  onRenterSelect: (renter: Renter) => void;
  onAutoAdvance: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [localRenters, setLocalRenters] = useState<Renter[]>([]); // newly created this session
  const searchRef = useRef<HTMLInputElement>(null);
  const [newRenter, setNewRenter] = useState({
    firstName: '', lastName: '', phone: '', email: '', idNumber: '',
    emergencyName: '', emergencyPhone: '',
  });

  useEffect(() => {
    if (!showCreate) searchRef.current?.focus();
  }, [showCreate]);

  const allAvailable = [...localRenters, ...allRenters];
  const results = search.trim().length < 1
    ? allAvailable.slice(0, 10)
    : allAvailable.filter(r => {
        const q = search.toLowerCase();
        const { firstName, lastName, phone, email, idNumber } = r.personalInfo;
        return [firstName, lastName, phone, email, idNumber, `${firstName} ${lastName}`]
          .some(v => v?.toLowerCase().includes(q));
      }).slice(0, 12);

  const initials = (r: Renter) => {
    const f = r.personalInfo.firstName?.[0] ?? '';
    const l = r.personalInfo.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || '?';
  };

  async function handleCreateRenter() {
    const { firstName, lastName, phone, email, idNumber } = newRenter;
    if (!firstName || !lastName || !phone || !idNumber) {
      setCreateError('First name, last name, phone and ID number are required.');
      return;
    }
    if (email.trim() && !isValidEmail(email)) {
      setCreateError(EMAIL_ERROR);
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const id = await renterService.createRenter({
        personalInfo: {
          firstName, lastName, idNumber, phone, email,
          dateOfBirth: null,
          emergencyContact: {
            name: newRenter.emergencyName,
            phone: newRenter.emergencyPhone,
            relationship: '',
          },
        },
        address: { street: '', city: '', province: '', postalCode: '' },
        employment: { employer: '', position: '', monthlyIncome: 0 },
        bankDetails: { accountHolder: '', bankName: '', accountNumber: '', branchCode: '' },
        status: 'active',
      });
      const created: Renter = {
        id,
        personalInfo: {
          firstName, lastName, idNumber, phone, email, dateOfBirth: null,
          emergencyContact: { name: newRenter.emergencyName, phone: newRenter.emergencyPhone, relationship: '' },
        },
        address: { street: '', city: '', province: '', postalCode: '' },
        employment: { employer: '', position: '', monthlyIncome: 0 },
        bankDetails: { accountHolder: '', bankName: '', accountNumber: '', branchCode: '' },
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      setLocalRenters(prev => [created, ...prev]);
      onRenterSelect(created);
      setShowCreate(false);
      // Auto-advance to Terms since renter is now selected
      setTimeout(onAutoAdvance, 300);
    } catch {
      setCreateError('Failed to create renter. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-white font-semibold text-base mb-0.5">Select a Renter</h3>
        <p className="text-gray-400 text-sm">Search by name, phone, or ID number.</p>
      </div>

      {/* Selected renter — always visible when set */}
      {selectedRenter && !showCreate && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-sm font-bold text-green-300 flex-shrink-0">
            {initials(selectedRenter)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-green-300 font-semibold text-sm">
              {selectedRenter.personalInfo.firstName} {selectedRenter.personalInfo.lastName}
            </p>
            <p className="text-green-500/70 text-xs truncate">
              {selectedRenter.personalInfo.phone}
              {selectedRenter.personalInfo.idNumber ? ` · ID: ${selectedRenter.personalInfo.idNumber}` : ''}
            </p>
          </div>
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check size={12} className="text-gray-900" />
          </div>
        </div>
      )}

      {!showCreate ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder={selectedRenter ? 'Search to change renter…' : 'Search renters…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/40"
            />
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-primary-500" />
              <span className="ml-2 text-sm text-gray-400">Loading renters…</span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {results.map(r => {
                const isSelected = selectedRenter?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => onRenterSelect(r)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                      isSelected
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-transparent bg-gray-700/40 hover:bg-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isSelected ? 'bg-primary-500 text-gray-900' : 'bg-gray-600 text-white'
                    }`}>
                      {isSelected ? <Check size={12} /> : initials(r)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm leading-tight ${isSelected ? 'text-primary-300' : 'text-white'}`}>
                        {r.personalInfo.firstName} {r.personalInfo.lastName}
                      </p>
                      <p className="text-gray-500 text-xs truncate mt-0.5">
                        {r.personalInfo.phone}
                        {r.personalInfo.idNumber ? ` · ${r.personalInfo.idNumber}` : ''}
                      </p>
                    </div>
                    {isSelected && <span className="text-xs text-primary-400 font-medium flex-shrink-0">Selected</span>}
                  </button>
                );
              })}
              {!search && allAvailable.length > 10 && (
                <p className="text-xs text-gray-500 text-center py-1">
                  Showing 10 of {allAvailable.length} — type to search all
                </p>
              )}
            </div>
          ) : search ? (
            <div className="text-center py-5 text-gray-500">
              <User size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No renter found for "<span className="text-gray-400">{search}</span>"</p>
            </div>
          ) : (
            <div className="text-center py-5 text-gray-500">
              <User size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No renters yet — create one below.</p>
            </div>
          )}

          {/* Create new */}
          <div className="border-t border-gray-700/60 pt-3">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-primary-500/50 hover:text-primary-400 transition-all text-sm font-medium"
            >
              <UserPlus size={14} />
              Create New Renter
            </button>
          </div>
        </>
      ) : (
        /* Inline create form */
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold text-sm flex items-center gap-2">
              <UserPlus size={14} className="text-primary-400" /> New Renter
            </p>
            <button
              onClick={() => setShowCreate(false)}
              className="text-gray-500 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'First Name *', field: 'firstName', icon: User },
              { label: 'Last Name *', field: 'lastName', icon: User },
              { label: 'Phone *', field: 'phone', icon: Phone },
              { label: 'ID Number *', field: 'idNumber', icon: Hash },
              { label: 'Email', field: 'email', icon: Mail },
              { label: 'Emergency Contact', field: 'emergencyName', icon: User },
            ].map(({ label, field, icon: Icon }) => (
              <div key={field}>
                <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                <div className="relative">
                  <Icon size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={(newRenter as any)[field]}
                    onChange={e => setNewRenter(prev => ({ ...prev, [field]: e.target.value }))}
                    onBlur={() => {
                      if (field === 'email') {
                        const v = (newRenter as any).email.trim();
                        if (v && !isValidEmail(v)) setCreateError(EMAIL_ERROR);
                        else setCreateError('');
                      }
                    }}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {createError && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={12} /> {createError}
            </div>
          )}

          <button
            onClick={handleCreateRenter}
            disabled={creating}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-gray-900 font-bold text-sm rounded-lg py-2.5 transition-all flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {creating ? 'Creating…' : 'Create & Select Renter'}
          </button>
          <p className="text-xs text-gray-500 text-center">Renter will be saved and automatically selected</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Lease Terms ──────────────────────────────────────────────────────

function StepTerms({
  room, terms, onChange,
}: {
  room: Room;
  terms: LeaseTerms;
  onChange: (t: LeaseTerms) => void;
}) {
  const set = (field: keyof LeaseTerms, value: any) => onChange({ ...terms, [field]: value });

  const childSurcharge = room.businessRules?.childSurcharge ?? 0;
  const baseRent = room.monthlyRent ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-white font-semibold text-base mb-1">Lease Terms</h3>
        <p className="text-gray-400 text-sm">Pre-filled from the room rate. Adjust if needed.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Dates */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Calendar size={11} /> Start Date *
          </label>
          <input
            type="date"
            value={terms.startDate}
            onChange={e => {
              set('startDate', e.target.value);
              // Auto-update end date to 1 year later
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-').map(Number);
                const end = new Date(y + 1, m - 1, d);
                set('endDate', `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`);
              }
            }}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Calendar size={11} /> End Date *
          </label>
          <input
            type="date"
            value={terms.endDate}
            onChange={e => set('endDate', e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Financials */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Banknote size={11} /> Monthly Rent (R) *
          </label>
          <input
            type="number"
            value={terms.monthlyRent}
            onChange={e => set('monthlyRent', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            <CreditCard size={11} /> Deposit Amount (R) *
          </label>
          <input
            type="number"
            value={terms.depositAmount}
            onChange={e => set('depositAmount', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Hash size={11} /> Payment Due Day *
          </label>
          <input
            type="number"
            min={1} max={28}
            value={terms.paymentDueDay}
            onChange={e => set('paymentDueDay', Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">Day of month rent is due (1–28)</p>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
            <User size={11} /> Children in Room
          </label>
          <input
            type="number"
            min={0}
            value={terms.childrenCount}
            onChange={e => {
              const count = Number(e.target.value);
              onChange({
                ...terms,
                childrenCount: count,
                monthlyRent: baseRent + count * childSurcharge,
              });
            }}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
          {childSurcharge > 0 && terms.childrenCount > 0 && (
            <p className="text-xs text-primary-400 mt-1">
              R{baseRent} base + {terms.childrenCount} × R{childSurcharge} = R{baseRent + terms.childrenCount * childSurcharge}/mo
            </p>
          )}
          {childSurcharge > 0 && terms.childrenCount === 0 && (
            <p className="text-xs text-gray-500 mt-1">R{childSurcharge}/child surcharge will be added</p>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
          <FileText size={11} /> Additional Terms (optional)
        </label>
        <textarea
          value={terms.additionalTerms}
          onChange={e => set('additionalTerms', e.target.value)}
          rows={3}
          placeholder="Any special conditions or notes…"
          className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500 resize-none"
        />
      </div>
    </div>
  );
}

// ─── Step 4: Review & Confirm ─────────────────────────────────────────────────

function StepReview({
  facility, room, renter, terms,
  onConfirm, creating, created, leaseId,
  onRecordPayment, onDone,
}: {
  facility: Facility | null;
  room: Room;
  renter: Renter;
  terms: LeaseTerms;
  onConfirm: () => void;
  creating: boolean;
  created: boolean;
  leaseId: string;
  onRecordPayment: () => void;
  onDone: () => void;
}) {
  if (created) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-5">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-400" />
        </div>
        <div className="text-center">
          <h3 className="text-white font-bold text-lg mb-1">Lease Created!</h3>
          <p className="text-gray-400 text-sm">
            {renter.personalInfo.firstName} is now renting Room {room.roomNumber}.
          </p>
        </div>
        <div className="w-full space-y-2 pt-2">
          <button
            onClick={onRecordPayment}
            className="w-full bg-primary-500 hover:bg-primary-600 text-gray-900 font-semibold rounded-xl py-3 transition-all flex items-center justify-center gap-2"
          >
            <Banknote size={16} /> Record First Payment
          </button>
          <button
            onClick={onDone}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl py-3 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-white font-semibold text-base mb-1">Review & Confirm</h3>
        <p className="text-gray-400 text-sm">Check the details before creating the lease.</p>
      </div>

      {/* Room summary */}
      <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
          <DoorClosed size={11} /> Room
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg">Room {room.roomNumber}</p>
            <p className="text-gray-400 text-sm">{ROOM_TYPE_LABELS[room.type]} · {facility?.name}</p>
          </div>
          <div className="text-right">
            <p className="text-primary-400 font-bold text-lg">R{terms.monthlyRent.toLocaleString()}</p>
            <p className="text-gray-500 text-xs">per month</p>
          </div>
        </div>
      </div>

      {/* Renter summary */}
      <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
          <User size={11} /> Renter
        </p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold text-white">
            {(renter.personalInfo.firstName[0] + renter.personalInfo.lastName[0]).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold">
              {renter.personalInfo.firstName} {renter.personalInfo.lastName}
            </p>
            <p className="text-gray-400 text-xs">{renter.personalInfo.phone} · {renter.personalInfo.idNumber}</p>
          </div>
        </div>
      </div>

      {/* Terms summary */}
      <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
          <FileText size={11} /> Terms
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {[
            ['Start', terms.startDate],
            ['End', terms.endDate],
            ['Monthly Rent', `R${terms.monthlyRent.toLocaleString()}`],
            ['Deposit', `R${terms.depositAmount.toLocaleString()}`],
            ['Due Day', `${terms.paymentDueDay}${terms.paymentDueDay === 1 ? 'st' : terms.paymentDueDay === 2 ? 'nd' : terms.paymentDueDay === 3 ? 'rd' : 'th'} of month`],
            ...(terms.childrenCount > 0 ? [['Children', String(terms.childrenCount)]] : []),
          ].map(([label, value]) => (
            <div key={label}>
              <span className="text-gray-500">{label}: </span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={creating}
        className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-gray-900 font-bold rounded-xl py-3.5 transition-all flex items-center justify-center gap-2 text-base"
      >
        {creating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {creating ? 'Creating Lease…' : 'Create Lease Agreement'}
      </button>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function NewRentalWizard({ onClose, initialRoom, initialFacility }: NewRentalWizardProps) {
  const { settings } = useOrganizationSettings();
  const navigate = useNavigate();

  // Start at step 2 if a room is pre-selected (launched from a room card)
  const [step, setStep] = useState<number>(initialRoom ? 2 : 1);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRenters, setAllRenters] = useState<Renter[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingRenters, setLoadingRenters] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Selections
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState<string | null>(
    initialRoom?.facilityId ?? initialFacility?.id ?? null
  );
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(initialRoom ?? null);
  const [selectedRenter, setSelectedRenter] = useState<Renter | null>(null);

  // Lease terms
  const today = new Date().toISOString().split('T')[0];
  const oneYearLater = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    .toISOString().split('T')[0];

  const [terms, setTerms] = useState<LeaseTerms>({
    startDate: today,
    endDate: oneYearLater,
    monthlyRent: initialRoom?.monthlyRent ?? 0,
    depositAmount: initialRoom?.depositAmount ?? 0,
    paymentDueDay: 1,
    childrenCount: 0,
    additionalTerms: '',
  });

  // Creation state
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [leaseId, setLeaseId] = useState('');
  const [createError, setCreateError] = useState('');
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    facilityService.getFacilities().then(setFacilities).catch(() => {});

    roomService.getAllRooms()
      .then(r => setRooms(r))
      .catch(() => setLoadError('Could not load rooms. Please close and try again.'))
      .finally(() => setLoadingRooms(false));

    renterService.getAllRenters()
      .then(r => setAllRenters(r))
      .catch(() => {})
      .finally(() => setLoadingRenters(false));
  }, []);

  // Pre-fill terms from room when selected
  useEffect(() => {
    if (selectedRoom) {
      setTerms(prev => ({
        ...prev,
        monthlyRent: selectedRoom.monthlyRent,
        depositAmount: selectedRoom.depositAmount,
      }));
    }
  }, [selectedRoom]);

  // Scroll to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const canProceed = useCallback(() => {
    if (step === 1) return !!selectedRoom;
    if (step === 2) return !!selectedRenter;
    if (step === 3) return !!(terms.startDate && terms.endDate && terms.monthlyRent > 0 && terms.depositAmount >= 0 && terms.paymentDueDay >= 1 && terms.paymentDueDay <= 28);
    return true;
  }, [step, selectedRoom, selectedRenter, terms]);

  const selectedFacility = facilities.find(f => f.id === selectedRoom?.facilityId) ?? null;

  async function handleCreate() {
    if (!selectedRoom || !selectedRenter) return;
    setCreating(true);
    setCreateError('');
    try {
      const startTs = Timestamp.fromDate(parseDateLocal(terms.startDate));
      const endTs = Timestamp.fromDate(parseDateLocal(terms.endDate));
      const paymentDueDate = terms.paymentDueDay;

      const leaseData = {
        facilityId: selectedRoom.facilityId,
        roomId: selectedRoom.id!,
        renterId: selectedRenter.id!,
        childrenCount: terms.childrenCount,
        terms: {
          startDate: startTs,
          endDate: endTs,
          monthlyRent: terms.monthlyRent,
          depositAmount: terms.depositAmount,
          depositPaid: false,
        },
        businessRules: {
          lateFeeAmount: selectedRoom.businessRules?.lateFeeAmount ?? 0,
          lateFeeStartDay: selectedRoom.businessRules?.lateFeeStartDay ?? 5,
          childSurcharge: selectedRoom.businessRules?.childSurcharge ?? 0,
          gracePeriodDays: selectedRoom.businessRules?.gracePeriodDays ?? 0,
          paymentMethods: selectedRoom.businessRules?.paymentMethods ?? ['cash'],
        },
        additionalTerms: terms.additionalTerms,
        status: 'active' as const,
      };

      const newLeaseId = await leaseService.createLease(leaseData);

      const scheduleData = generatePaymentSchedule(
        { ...leaseData, id: newLeaseId },
        true,
        paymentDueDate,
      );
      await paymentScheduleService.createPaymentSchedule(scheduleData);
      await roomService.updateRoom(selectedRoom.id!, { status: 'occupied' });

      setLeaseId(newLeaseId);
      setCreated(true);
    } catch (e) {
      setCreateError('Failed to create lease. Please try again.');
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  // Build the lease object for PaymentCapture from wizard state after creation
  const captureableLease = showPaymentCapture && selectedRoom && selectedRenter && leaseId ? {
    id: leaseId,
    facilityId: selectedRoom.facilityId,
    roomId: selectedRoom.id!,
    renterId: selectedRenter.id!,
    terms: {
      startDate: Timestamp.fromDate(parseDateLocal(terms.startDate)),
      endDate: Timestamp.fromDate(parseDateLocal(terms.endDate)),
      monthlyRent: terms.monthlyRent,
      depositAmount: terms.depositAmount,
      depositPaid: false,
    },
    businessRules: {
      lateFeeAmount: selectedRoom.businessRules?.lateFeeAmount ?? 0,
      lateFeeStartDay: selectedRoom.businessRules?.lateFeeStartDay ?? 0,
      gracePeriodDays: selectedRoom.businessRules?.gracePeriodDays ?? 0,
    },
    status: 'active' as const,
  } : null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div
        className={`w-full bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${showPaymentCapture ? 'max-w-2xl' : 'max-w-lg'}`}
        style={{ maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* When capturing payment: replace all wizard chrome with PaymentCapture */}
        {captureableLease ? (
          <div className="flex-1 overflow-y-auto p-6">
            <PaymentCapture
              lease={captureableLease}
              onSuccess={onClose}
              onCancel={onClose}
            />
          </div>
        ) : <>

        <ProgressHeader step={created ? 4 : step} onClose={onClose} />

        {/* Context summary bar — shows above content in steps 2+ */}
        {step >= 2 && !created && (selectedRoom || selectedRenter) && (
          <div className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 bg-gray-800/80 border-b border-gray-700/60">
            {selectedRoom && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
                <DoorClosed size={11} className="text-primary-400 flex-shrink-0" />
                <span className="font-medium text-primary-300 truncate">Rm {selectedRoom.roomNumber}</span>
                <span className="text-gray-600">·</span>
                <span>R{selectedRoom.monthlyRent.toLocaleString()}/mo</span>
              </div>
            )}
            {selectedRoom && selectedRenter && <span className="text-gray-700">|</span>}
            {selectedRenter && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
                <User size={11} className="text-green-400 flex-shrink-0" />
                <span className="font-medium text-green-300 truncate">
                  {selectedRenter.personalInfo.firstName} {selectedRenter.personalInfo.lastName}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-6">
          {(createError || loadError) && (
            <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={14} /> {createError || loadError}
            </div>
          )}

          {step === 1 && (
            <StepRoom
              facilities={facilities}
              rooms={rooms}
              loading={loadingRooms}
              selectedFacilityId={selectedFacilityFilter}
              onFacilitySelect={setSelectedFacilityFilter}
              selectedRoom={selectedRoom}
              onRoomSelect={room => {
                setSelectedRoom(room);
                setSelectedFacilityFilter(room.facilityId);
                // Auto-advance to Renter step after a short delay so selection animates
                setTimeout(() => setStep(2), 350);
              }}
            />
          )}
          {step === 2 && (
            <StepRenter
              allRenters={allRenters}
              loading={loadingRenters}
              selectedRenter={selectedRenter}
              onRenterSelect={setSelectedRenter}
              onAutoAdvance={() => setStep(3)}
            />
          )}
          {step === 3 && selectedRoom && (
            <StepTerms
              room={selectedRoom}
              terms={terms}
              onChange={setTerms}
            />
          )}
          {step === 4 && selectedRoom && selectedRenter && (
            <StepReview
              facility={selectedFacility}
              room={selectedRoom}
              renter={selectedRenter}
              terms={terms}
              onConfirm={handleCreate}
              creating={creating}
              created={created}
              leaseId={leaseId}
              onRecordPayment={() => setShowPaymentCapture(true)}
              onDone={onClose}
            />
          )}
        </div>

        {/* Footer nav */}
        {!created && (
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-700 bg-gray-800/60">
            <button
              onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-700"
            >
              <ChevronLeft size={15} />
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 && (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-gray-900 font-semibold text-sm rounded-xl px-5 py-2.5 transition-all"
              >
                {step === 3 ? 'Review' : 'Next'}
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
