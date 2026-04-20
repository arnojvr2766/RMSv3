import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  RefreshCw,
  Camera,
  Upload,
  Trash2,
  Image,
} from 'lucide-react';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { facilityService } from '../services/firebaseService';
import Card from '../components/ui/Card';
import { TableSkeleton } from '../components/ui/SkeletonLoader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type ComplaintPriority = 'low' | 'medium' | 'high' | 'urgent';
type ComplaintCategory = 'maintenance' | 'noise' | 'damage' | 'billing' | 'other';
type MaintenanceSubCategory = 'plumbing' | 'electrical' | 'staff' | 'paint' | 'windows_doors' | 'other';

const MAINTENANCE_SUBCATEGORIES: { value: MaintenanceSubCategory; label: string }[] = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'staff', label: 'Staff' },
  { value: 'paint', label: 'Paint' },
  { value: 'windows_doors', label: 'Windows / Doors' },
  { value: 'other', label: 'Other' },
];

interface Complaint {
  id?: string;
  facilityId: string;
  facilityName?: string;
  roomNumber: string;
  renterName: string;
  category: ComplaintCategory;
  maintenanceSubCategory?: MaintenanceSubCategory;
  priority: ComplaintPriority;
  subject: string;
  description: string;
  status: ComplaintStatus;
  resolution?: string;
  photoData?: { fileName: string; fileType: string; data: string; uploadedAt: any } | null;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

const PRIORITY_COLORS: Record<ComplaintPriority, string> = {
  low:    'bg-gray-500/20 text-gray-300 border-gray-500/30',
  medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  high:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  open:        'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved:    'bg-green-500/20 text-green-300 border-green-500/30',
  closed:      'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const STATUS_ICONS: Record<ComplaintStatus, React.ReactNode> = {
  open:        <AlertTriangle className="w-3.5 h-3.5" />,
  in_progress: <Clock className="w-3.5 h-3.5" />,
  resolved:    <CheckCircle className="w-3.5 h-3.5" />,
  closed:      <X className="w-3.5 h-3.5" />,
};

const CATEGORY_ICONS: Record<ComplaintCategory, React.ReactNode> = {
  maintenance: <Wrench className="w-4 h-4" />,
  noise:       <MessageSquare className="w-4 h-4" />,
  damage:      <AlertTriangle className="w-4 h-4" />,
  billing:     <MessageSquare className="w-4 h-4" />,
  other:       <MessageSquare className="w-4 h-4" />,
};

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts as any);
  return d.toLocaleDateString('default', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── New complaint form modal ─────────────────────────────────────────────────

interface ComplaintFormProps {
  facilities: { id: string; name: string }[];
  onSave: (data: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  onCancel: () => void;
}

const ComplaintForm: React.FC<ComplaintFormProps> = ({ facilities, onSave, onCancel }) => {
  const [form, setForm] = useState({
    facilityId: facilities[0]?.id || '',
    roomNumber: '',
    renterName: '',
    category: 'other' as ComplaintCategory,
    maintenanceSubCategory: 'other' as MaintenanceSubCategory,
    priority: 'medium' as ComplaintPriority,
    subject: '',
    description: '',
    status: 'open' as ComplaintStatus,
    resolution: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim() || !form.facilityId) {
      setError('Facility, subject and description are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const facility = facilities.find(f => f.id === form.facilityId);
      let photoData: Complaint['photoData'] = null;
      if (photoFile && photoPreview) {
        photoData = {
          fileName: photoFile.name,
          fileType: photoFile.type,
          data: photoPreview,
          uploadedAt: new Date().toISOString(),
        };
      }
      const payload: any = { ...form, facilityName: facility?.name, photoData };
      if (form.category !== 'maintenance') delete payload.maintenanceSubCategory;
      await onSave(payload);
    } catch (err: any) {
      setError(err.message || 'Failed to save complaint.');
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-white">New Complaint</h2>
          <Button variant="ghost" onClick={onCancel}><X className="w-5 h-5" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Facility *</label>
              <select value={form.facilityId} onChange={e => set('facilityId', e.target.value)} className={selectClass}>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <Input label="Room Number" value={form.roomNumber} onChange={e => set('roomNumber', e.target.value)} placeholder="e.g. 101" />
          </div>

          <Input label="Renter Name" value={form.renterName} onChange={e => set('renterName', e.target.value)} placeholder="Full name of complainant" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={selectClass}>
                <option value="maintenance">Maintenance</option>
                <option value="noise">Noise</option>
                <option value="damage">Damage</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className={selectClass}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Maintenance sub-category — only when category is maintenance */}
          {form.category === 'maintenance' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Maintenance Type</label>
              <select value={form.maintenanceSubCategory} onChange={e => set('maintenanceSubCategory', e.target.value)} className={selectClass}>
                {MAINTENANCE_SUBCATEGORIES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          <Input label="Subject *" value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Brief summary of the complaint" />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={4} placeholder="Full details of the complaint…"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
          </div>

          {/* Photo attachment */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Image className="w-4 h-4 inline mr-1.5 text-gray-400" />
              Photo Attachment (Optional)
            </label>
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Complaint photo" className="w-full h-40 object-cover rounded-lg border border-gray-600" />
                <button type="button" onClick={removePhoto}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <p className="text-xs text-gray-400 mt-1">{photoFile?.name}</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="complaint-photo" />
                <label htmlFor="complaint-photo"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors cursor-pointer text-sm">
                  <Upload className="w-4 h-4" />Upload Photo
                </label>
                <label htmlFor="complaint-photo"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors cursor-pointer text-sm"
                  onClick={() => { if (fileInputRef.current) { fileInputRef.current.setAttribute('capture', 'environment'); fileInputRef.current.click(); } }}>
                  <Camera className="w-4 h-4" />Take Photo
                </label>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Submit Complaint'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Detail / update modal ────────────────────────────────────────────────────

interface ComplaintDetailProps {
  complaint: Complaint;
  isAdmin: boolean;
  onUpdate: (id: string, updates: Partial<Complaint>) => Promise<void>;
  onClose: () => void;
}

const ComplaintDetail: React.FC<ComplaintDetailProps> = ({ complaint, isAdmin, onUpdate, onClose }) => {
  const [status, setStatus] = useState(complaint.status);
  const [resolution, setResolution] = useState(complaint.resolution || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(complaint.id!, { status, resolution });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-white">Complaint Details</h2>
          <Button variant="ghost" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[complaint.status]}`}>
              {STATUS_ICONS[complaint.status]}
              {complaint.status.replace('_', ' ')}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full border ${PRIORITY_COLORS[complaint.priority]}`}>
              {complaint.priority}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300 border border-gray-600 capitalize">
              {complaint.category}
            </span>
            {complaint.maintenanceSubCategory && (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300 border border-gray-600 capitalize">
                {MAINTENANCE_SUBCATEGORIES.find(s => s.value === complaint.maintenanceSubCategory)?.label || complaint.maintenanceSubCategory}
              </span>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-400">Subject</p>
            <p className="text-white font-medium">{complaint.subject}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400">Facility</p>
              <p className="text-white">{complaint.facilityName || complaint.facilityId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Room</p>
              <p className="text-white">{complaint.roomNumber || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Renter</p>
              <p className="text-white">{complaint.renterName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Submitted</p>
              <p className="text-white">{formatDate(complaint.createdAt)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1">Description</p>
            <p className="text-gray-200 text-sm bg-gray-700/50 rounded-lg p-3 leading-relaxed">{complaint.description}</p>
          </div>

          {complaint.photoData && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Photo</p>
              <img src={complaint.photoData.data} alt="Complaint photo"
                className="w-full max-h-64 object-cover rounded-lg border border-gray-600 cursor-pointer"
                onClick={() => window.open(complaint.photoData!.data, '_blank')} />
            </div>
          )}

          {isAdmin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Update Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as ComplaintStatus)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Resolution Notes</label>
                <textarea value={resolution} onChange={e => setResolution(e.target.value)}
                  rows={3} placeholder="Describe how the complaint was resolved…"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Update Complaint'}
                </Button>
              </div>
            </>
          )}

          {!isAdmin && complaint.resolution && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Resolution</p>
              <p className="text-gray-200 text-sm bg-gray-700/50 rounded-lg p-3">{complaint.resolution}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const Complaints: React.FC = () => {
  const { user } = useAuth();
  const { isSystemAdmin } = useRole();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'all'>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [facilitiesData, complaintsSnap] = await Promise.all([
        facilityService.getFacilities(),
        getDocs(query(collection(db, 'complaints'), orderBy('createdAt', 'desc'))),
      ]);
      setFacilities(facilitiesData.map(f => ({ id: f.id!, name: f.name })));
      setComplaints(complaintsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Complaint)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (data: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    await addDoc(collection(db, 'complaints'), {
      ...data,
      createdBy: user?.uid || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowForm(false);
    await loadData();
  };

  const handleUpdate = async (id: string, updates: Partial<Complaint>) => {
    await updateDoc(doc(db, 'complaints', id), { ...updates, updatedAt: serverTimestamp() });
    await loadData();
  };

  const filtered = statusFilter === 'all' ? complaints : complaints.filter(c => c.status === statusFilter);
  const counts = {
    open: complaints.filter(c => c.status === 'open').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  return (
    <div className="w-full space-y-6 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-yellow-400" />
            Complaints
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Track and resolve tenant complaints</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={loadData} title="Refresh"><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />New Complaint
          </Button>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-3">
        {([
          { label: 'Open', count: counts.open, color: 'bg-yellow-500/20 text-yellow-300', status: 'open' as const },
          { label: 'In Progress', count: counts.in_progress, color: 'bg-blue-500/20 text-blue-300', status: 'in_progress' as const },
          { label: 'Resolved', count: counts.resolved, color: 'bg-green-500/20 text-green-300', status: 'resolved' as const },
        ]).map(chip => (
          <button key={chip.status}
            onClick={() => setStatusFilter(statusFilter === chip.status ? 'all' : chip.status)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${chip.color} ${statusFilter === chip.status ? 'ring-2 ring-white/30' : 'opacity-80 hover:opacity-100'}`}>
            {chip.label}
            <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-xs">{chip.count}</span>
          </button>
        ))}
        {statusFilter !== 'all' && (
          <button onClick={() => setStatusFilter('all')} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-2">
          <TableSkeleton rows={6} cols={5} />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {statusFilter === 'all' ? 'No complaints yet.' : `No ${statusFilter.replace('_', ' ')} complaints.`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <Card key={c.id} className="cursor-pointer hover:bg-gray-700/50 transition-colors" onClick={() => setSelected(c)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="text-gray-400 mt-0.5 flex-shrink-0">{CATEGORY_ICONS[c.category]}</div>
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{c.subject}</p>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {c.facilityName || c.facilityId}
                      {c.roomNumber && ` · Room ${c.roomNumber}`}
                      {c.renterName && ` · ${c.renterName}`}
                      {c.maintenanceSubCategory && ` · ${MAINTENANCE_SUBCATEGORIES.find(s => s.value === c.maintenanceSubCategory)?.label}`}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">{formatDate(c.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status]}`}>
                    {STATUS_ICONS[c.status]}
                    {c.status.replace('_', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[c.priority]}`}>
                    {c.priority}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <ComplaintForm facilities={facilities} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {selected && (
        <ComplaintDetail complaint={selected} isAdmin={isSystemAdmin} onUpdate={handleUpdate} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

export default Complaints;
