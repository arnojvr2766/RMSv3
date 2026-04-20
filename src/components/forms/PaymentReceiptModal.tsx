import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle, Printer, X, Building2, User, Home, Calendar, TrendingUp } from 'lucide-react';
import { generatePDF } from '../../services/pdfService';

interface PaymentReceiptProps {
  amount: number;
  paymentMethod: string;
  paymentDate: string;       // YYYY-MM-DD
  monthCovered: string;      // YYYY-MM or YYYY-MM-deposit
  leaseId: string;
  paymentSchedule: any;
  renterName: string;
  roomNumber: string;
  facilityName: string;
  penaltyPaid: number;
  penaltyMethod: string;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function receiptRef(date: string): string {
  return `RD-${date.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function fmtMethod(method: string): string {
  const map: Record<string, string> = {
    cash: 'Cash', bank_transfer: 'Bank Transfer', eft: 'EFT',
    card: 'Card', mobile: 'Mobile Payment', cheque: 'Cheque',
  };
  return map[method] ?? method;
}

function fmtDate(ts: any): string {
  if (!ts) return '—';
  const d: Date = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateStr(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMonth(ym: string): string {
  if (!ym) return '—';
  if (ym.endsWith('-deposit')) {
    const [y, m] = ym.replace('-deposit', '').split('-').map(Number);
    return `Deposit — ${new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`;
  }
  const parts = ym.split('-');
  if (parts.length < 2) return ym;
  const [y, m] = parts.map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function fmtR(n: number | undefined): string {
  if (n == null) return 'R 0.00';
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'paid':              return { bg: '#14532d', text: '#4ade80' };
    case 'partial':           return { bg: '#713f12', text: '#fbbf24' };
    case 'overdue':           return { bg: '#7f1d1d', text: '#f87171' };
    case 'pending_approval':  return { bg: '#1e3a5f', text: '#60a5fa' };
    default:                  return { bg: '#1f2937', text: '#9ca3af' };
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

const PaymentReceiptModal: React.FC<PaymentReceiptProps> = ({
  amount, paymentMethod, paymentDate, monthCovered,
  leaseId, paymentSchedule, renterName, roomNumber, facilityName,
  penaltyPaid, penaltyMethod, onClose,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const ref = useMemo(() => receiptRef(paymentDate), [paymentDate]);

  const handleExportPDF = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      await generatePDF(sheetRef.current, {
        filename: `RentDesk-Statement-${renterName.replace(/\s+/g, '-')}-${paymentDate}.pdf`,
        scale: 2,
        padding: 8,
      });
    } finally {
      setExporting(false);
    }
  };
  const generatedAt = new Date().toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const payments: any[] = paymentSchedule?.payments ?? [];

  // Sort: deposit first, then by due date
  const sorted = [...payments].sort((a, b) => {
    if (a.type === 'deposit') return -1;
    if (b.type === 'deposit') return 1;
    const da = a.dueDate?.toDate?.() ?? new Date(0);
    const db = b.dueDate?.toDate?.() ?? new Date(0);
    return da.getTime() - db.getTime();
  });

  const totalCharged = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid    = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
  const outstanding  = Math.max(0, totalCharged - totalPaid);
  const penaltyOutstanding = paymentSchedule?.aggregatedPenalty?.outstandingAmount ?? 0;

  // Upcoming = next 3 pending/partial payments after today
  const today = new Date();
  const upcoming = sorted.filter(p =>
    (p.status === 'pending' || p.status === 'overdue') &&
    p.type === 'rent'
  ).slice(0, 3);

  const totalThisTransaction = amount + (penaltyPaid || 0);

  return (
    <>
      <div id="receipt-root">
        <div className="receipt-overlay fixed inset-0 bg-black/80 z-50 flex items-start justify-center p-4 overflow-y-auto">

          {/* Close button */}
          <button
            onClick={onClose}
            className="no-print fixed top-4 right-4 text-gray-400 hover:text-white z-50 bg-gray-800 rounded-full p-1.5"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Statement sheet */}
          <div ref={sheetRef} className="receipt-sheet bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-6 text-gray-900">

            {/* ── Header ── */}
            <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }} className="px-8 py-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm tracking-widest uppercase">
                      {facilityName || 'RentDesk'}
                    </span>
                  </div>
                  <h1 className="text-white text-2xl font-extrabold tracking-tight">Account Statement</h1>
                  <p className="text-gray-400 text-xs mt-1">Generated {generatedAt}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-3">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Reference</div>
                    <div className="font-mono text-yellow-400 text-sm font-bold border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 rounded-full">
                      {ref}
                    </div>
                  </div>
                  <div className="no-print flex gap-2">
                    <button
                      onClick={handleExportPDF}
                      disabled={exporting}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      {exporting ? 'Generating…' : 'Save PDF'}
                    </button>
                    <button
                      onClick={onClose}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>

              {/* Account info strip */}
              <div className="mt-5 grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="text-gray-400 text-xs">Tenant</div>
                    <div className="text-white text-sm font-semibold">{renterName || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="text-gray-400 text-xs">Room</div>
                    <div className="text-white text-sm font-semibold">{roomNumber || '—'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="text-gray-400 text-xs">Lease</div>
                    <div className="text-white text-xs font-mono truncate">{leaseId.slice(-8).toUpperCase()}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── This Transaction ── */}
            <div className="bg-green-50 border-b border-green-100 px-8 py-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-green-700 font-bold text-base">Payment Received</div>
                    <div className="text-green-600 text-sm">{fmtMonth(monthCovered)} · {fmtDateStr(paymentDate)} · {fmtMethod(paymentMethod)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-extrabold text-green-700">{fmtR(amount)}</div>
                  {penaltyPaid > 0 && (
                    <div className="text-xs text-green-600 mt-0.5">
                      + {fmtR(penaltyPaid)} penalty ({fmtMethod(penaltyMethod)})
                    </div>
                  )}
                  {penaltyPaid > 0 && (
                    <div className="text-sm font-bold text-green-800 mt-0.5">Total {fmtR(totalThisTransaction)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Account Summary ── */}
            <div className="px-8 py-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Account Summary</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Charged', value: fmtR(totalCharged), color: 'text-gray-800' },
                  { label: 'Total Paid',    value: fmtR(totalPaid),    color: 'text-green-700' },
                  { label: 'Outstanding',   value: fmtR(outstanding),  color: outstanding > 0 ? 'text-red-600' : 'text-green-700' },
                  { label: 'Penalties',     value: fmtR(penaltyOutstanding), color: penaltyOutstanding > 0 ? 'text-orange-600' : 'text-green-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <div className="text-xs text-gray-400 mb-1">{label}</div>
                    <div className={`text-base font-bold ${color}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Payment History ── */}
            <div className="px-8 py-5 border-b border-gray-100">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Payment History</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs text-gray-400 font-semibold pb-2 pr-3">Period</th>
                    <th className="text-left text-xs text-gray-400 font-semibold pb-2 pr-3">Due Date</th>
                    <th className="text-right text-xs text-gray-400 font-semibold pb-2 pr-3">Amount</th>
                    <th className="text-right text-xs text-gray-400 font-semibold pb-2 pr-3">Paid</th>
                    <th className="text-right text-xs text-gray-400 font-semibold pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p, i) => {
                    const isThisPayment = p.month === monthCovered;
                    const sc = statusColor(p.status);
                    return (
                      <tr
                        key={i}
                        style={isThisPayment ? { background: '#f0fdf4' } : {}}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-2 pr-3">
                          <span className={`font-medium ${isThisPayment ? 'text-green-700' : 'text-gray-800'}`}>
                            {fmtMonth(p.month)}
                          </span>
                          {isThisPayment && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">
                              THIS PAYMENT
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-gray-500">{fmtDate(p.dueDate)}</td>
                        <td className="py-2 pr-3 text-right font-medium text-gray-800">{fmtR(p.amount)}</td>
                        <td className="py-2 pr-3 text-right">
                          {p.paidAmount != null && p.paidAmount > 0
                            ? <span className="text-green-700 font-medium">{fmtR(p.paidAmount)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {statusLabel(p.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Upcoming Payments ── */}
            {upcoming.length > 0 && (
              <div className="px-8 py-5 border-b border-gray-100 bg-gray-50">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Upcoming Payments</div>
                <div className="space-y-2">
                  {upcoming.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="text-sm text-gray-700 font-medium">{fmtMonth(p.month)}</div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400">Due {fmtDate(p.dueDate)}</span>
                        <span className="text-sm font-bold text-gray-800">{fmtR(p.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Footer ── */}
            <div className="px-8 py-4 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                RentDesk · {facilityName} · Thank you for your payment.
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentReceiptModal;
