import React, { useState, useMemo } from 'react';
import { TrendingUp, X, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useToast } from '../../contexts/ToastContext';

interface RentIncreaseFormProps {
  leaseId: string;
  currentRent: number;
  roomNumber: string;
  renterName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const RentIncreaseForm: React.FC<RentIncreaseFormProps> = ({
  leaseId, currentRent, roomNumber, renterName, onSuccess, onCancel
}) => {
  const { showSuccess, showError } = useToast();

  // Default effective date = 1st of next month
  const defaultEffective = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 1);
    return d.toISOString().split('T')[0];
  })();

  const [newRent, setNewRent] = useState<number | ''>('');
  const [effectiveDate, setEffectiveDate] = useState(defaultEffective);
  const [reason, setReason] = useState('Annual rental escalation');
  const [saving, setSaving] = useState(false);

  const increase = useMemo(() => {
    if (!newRent || newRent <= 0) return null;
    const diff = Number(newRent) - currentRent;
    const pct = ((diff / currentRent) * 100).toFixed(1);
    return { diff, pct };
  }, [newRent, currentRent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRent || Number(newRent) <= 0) return;
    if (Number(newRent) === currentRent) {
      showError('New rent is the same as current rent.');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'leases', leaseId), {
        'terms.monthlyRent': Number(newRent),
        rentHistory: arrayUnion({
          previousRent: currentRent,
          newRent: Number(newRent),
          effectiveDate: Timestamp.fromDate(new Date(effectiveDate)),
          reason,
          recordedAt: Timestamp.now(),
        }),
        updatedAt: Timestamp.now(),
      });
      showSuccess(`Rent updated to R${Number(newRent).toLocaleString()} effective ${effectiveDate}`);
      onSuccess();
    } catch (err: any) {
      showError(err.message || 'Failed to update rent.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Update Rent</h2>
              <p className="text-xs text-gray-400">{renterName} · Room {roomNumber}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current vs New */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-0.5">Current Rent</p>
              <p className="text-lg font-bold text-white">R{currentRent.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-lg border ${increase && increase.diff > 0 ? 'bg-green-500/10 border-green-500/30' : increase && increase.diff < 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-gray-700/50 border-gray-600'}`}>
              <p className="text-xs text-gray-400 mb-0.5">New Rent</p>
              {increase ? (
                <div>
                  <p className="text-lg font-bold text-white">R{Number(newRent).toLocaleString()}</p>
                  <p className={`text-xs ${increase.diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {increase.diff > 0 ? '+' : ''}R{increase.diff.toLocaleString()} ({increase.pct}%)
                  </p>
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-500">—</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">New Monthly Rent (R) *</label>
            <input
              type="number"
              value={newRent}
              onChange={e => setNewRent(e.target.value ? Number(e.target.value) : '')}
              min={1}
              placeholder={`e.g. ${Math.round(currentRent * 1.1)}`}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Effective Date *</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={e => setEffectiveDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          {increase && Math.abs(Number(increase.pct)) > 15 && (
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-300 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>This is a {Math.abs(Number(increase.pct))}% change — please confirm this is correct.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving || !newRent}>
              {saving ? 'Saving…' : 'Update Rent'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RentIncreaseForm;
