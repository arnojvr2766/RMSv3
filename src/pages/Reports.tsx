import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Building2,
  DoorClosed,
  DollarSign,
  AlertCircle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Users,
  Printer,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  facilityService,
  roomService,
  leaseService,
  paymentScheduleService,
  type PaymentSchedule,
} from '../services/firebaseService';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FacilitySummary {
  id: string;
  name: string;
  totalRooms: number;
  occupiedRooms: number;
  lockedRooms: number;
  emptyRooms: number;
  availableRooms: number;
  occupancyRate: number;
  monthlyIncome: number;       // sum of paid rent this month
  outstandingRent: number;     // sum of pending/overdue rent this month
  depositLiability: number;    // sum of all deposits held
  overdueAccounts: OverdueAccount[];
}

interface OverdueAccount {
  roomNumber: string;
  renterName: string;
  monthsOverdue: string[];
  totalOwed: number;
}

interface MonthlyTotals {
  month: string;              // "YYYY-MM"
  label: string;              // "Jan 2025"
  collected: number;
  outstanding: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function monthLabel(ym: string): string {
  const [year, month] = ym.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString('default', { month: 'short', year: 'numeric' });
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function lastNMonths(n: number): string[] {
  const months: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function exportCSV(filename: string, rows: string[][]): void {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ──────────────────────────────────────────────────────────────

const Reports: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [facilitySummaries, setFacilitySummaries] = useState<FacilitySummary[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [totalDepositLiability, setTotalDepositLiability] = useState(0);

  const availableMonths = lastNMonths(12);
  const selectedMonthIdx = availableMonths.indexOf(selectedMonth);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [facilities, allRooms, allLeases, allSchedules] = await Promise.all([
        facilityService.getFacilities(),
        roomService.getAllRooms(),
        leaseService.getAllLeases(),
        paymentScheduleService.getAllPaymentSchedules(),
      ]);

      // Build renter name map from leases (leases carry renter info when enriched,
      // but we use renterId as fallback label here since this is reports)
      const leaseByRoom = new Map(allLeases.map(l => [l.roomId, l]));
      const scheduleByLease = new Map(allSchedules.map(s => [s.leaseId, s]));

      // ── Per-facility summaries for selected month ────────────────────────
      const summaries: FacilitySummary[] = facilities.map(facility => {
        const rooms = allRooms.filter(r => r.facilityId === facility.id);
        const occupied = rooms.filter(r => r.status === 'occupied').length;
        const locked  = rooms.filter(r => r.status === 'locked').length;
        const empty   = rooms.filter(r => r.status === 'empty').length;
        const available = rooms.filter(r => r.status === 'available').length;
        const occupancyRate = rooms.length > 0
          ? Math.round(((occupied + locked) / rooms.length) * 100)
          : 0;

        let monthlyIncome = 0;
        let outstandingRent = 0;
        let depositLiability = 0;
        const overdueAccounts: OverdueAccount[] = [];

        for (const room of rooms) {
          const lease = leaseByRoom.get(room.id!);
          if (!lease) continue;
          const schedule = scheduleByLease.get(lease.id!);
          if (!schedule) continue;

          // Deposit liability: sum of all paid deposit entries
          schedule.payments
            .filter(p => p.type === 'deposit' && p.status === 'paid')
            .forEach(p => { depositLiability += p.paidAmount ?? p.amount; });

          // Income / outstanding for selected month
          const payment = schedule.payments.find(
            p => p.month === selectedMonth && p.type === 'rent'
          );
          if (payment) {
            if (payment.status === 'paid') {
              monthlyIncome += payment.paidAmount ?? payment.amount;
            } else if (payment.status === 'partial') {
              monthlyIncome += payment.paidAmount ?? 0;
              outstandingRent += payment.amount - (payment.paidAmount ?? 0);
            } else if (payment.status === 'pending' || payment.status === 'overdue') {
              outstandingRent += payment.amount;
            }
          }

          // Overdue accounts: any rent payment that is overdue or still pending
          // in months before this one
          const overdueMonths = schedule.payments
            .filter(p =>
              p.type === 'rent' &&
              (p.status === 'overdue' || (p.status === 'pending' && p.month < selectedMonth))
            )
            .map(p => p.month);

          if (overdueMonths.length > 0) {
            const totalOwed = schedule.payments
              .filter(p => overdueMonths.includes(p.month))
              .reduce((sum, p) => sum + p.amount - (p.paidAmount ?? 0), 0);

            overdueAccounts.push({
              roomNumber: room.roomNumber,
              renterName: lease.renterId, // will enrich below if renter name available
              monthsOverdue: overdueMonths,
              totalOwed,
            });
          }
        }

        return {
          id: facility.id!,
          name: facility.name,
          totalRooms: rooms.length,
          occupiedRooms: occupied,
          lockedRooms: locked,
          emptyRooms: empty,
          availableRooms: available,
          occupancyRate,
          monthlyIncome,
          outstandingRent,
          depositLiability,
          overdueAccounts,
        };
      });

      setFacilitySummaries(summaries);
      setTotalDepositLiability(summaries.reduce((s, f) => s + f.depositLiability, 0));

      // ── Monthly totals for last 12 months (all facilities combined) ──────
      const months = lastNMonths(12);
      const totals: MonthlyTotals[] = months.map(month => {
        let collected = 0;
        let outstanding = 0;
        for (const schedule of allSchedules) {
          const p = schedule.payments.find(
            pay => pay.month === month && pay.type === 'rent'
          );
          if (!p) continue;
          if (p.status === 'paid') {
            collected += p.paidAmount ?? p.amount;
          } else if (p.status === 'partial') {
            collected += p.paidAmount ?? 0;
            outstanding += p.amount - (p.paidAmount ?? 0);
          } else if (p.status === 'pending' || p.status === 'overdue') {
            outstanding += p.amount;
          }
        }
        return { month, label: monthLabel(month), collected, outstanding };
      });
      setMonthlyTotals(totals);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Aggregates ─────────────────────────────────────────────────────────
  const totalRooms     = facilitySummaries.reduce((s, f) => s + f.totalRooms, 0);
  const totalOccupied  = facilitySummaries.reduce((s, f) => s + f.occupiedRooms + f.lockedRooms, 0);
  const totalIncome    = facilitySummaries.reduce((s, f) => s + f.monthlyIncome, 0);
  const totalOutstanding = facilitySummaries.reduce((s, f) => s + f.outstandingRent, 0);
  const overallOccupancy = totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0;
  const allOverdue = facilitySummaries.flatMap(f => f.overdueAccounts);

  // ── CSV exports ─────────────────────────────────────────────────────────
  const exportIncomeCSV = () => {
    const rows = [
      ['Facility', 'Month', 'Collected (R)', 'Outstanding (R)', 'Occupancy %'],
      ...facilitySummaries.map(f => [
        f.name,
        monthLabel(selectedMonth),
        f.monthlyIncome.toFixed(2),
        f.outstandingRent.toFixed(2),
        `${f.occupancyRate}%`,
      ]),
    ];
    exportCSV(`income-report-${selectedMonth}.csv`, rows);
  };

  const exportOverdueCSV = () => {
    const rows = [
      ['Facility', 'Room', 'Months Overdue', 'Total Owed (R)'],
      ...facilitySummaries.flatMap(f =>
        f.overdueAccounts.map(a => [
          f.name,
          a.roomNumber,
          a.monthsOverdue.map(monthLabel).join('; '),
          a.totalOwed.toFixed(2),
        ])
      ),
    ];
    exportCSV(`overdue-accounts-${selectedMonth}.csv`, rows);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-8">
      <style>{`
        @media print {
          header, nav, aside, .lg\\:hidden, [class*="sidebar"], .print-hide { display: none !important; }
          body { background: white !important; color: black !important; }
          .bg-gray-800, .bg-gray-700, .bg-gray-900 { background: white !important; border: 1px solid #e5e7eb !important; }
          .text-white, .text-gray-300, .text-gray-400 { color: black !important; }
          .text-green-400, .text-red-400, .text-yellow-400 { color: inherit !important; }
        }
      `}</style>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-yellow-400" />
            Reports
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Financial and occupancy overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={loadData} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="secondary" onClick={exportIncomeCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export Income
          </Button>
          <Button variant="secondary" onClick={exportOverdueCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export Overdue
          </Button>
          <Button variant="ghost" onClick={() => window.print()} title="Export as PDF">
            <Printer className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm">Showing month:</span>
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => selectedMonthIdx > 0 && setSelectedMonth(availableMonths[selectedMonthIdx - 1])}
            disabled={selectedMonthIdx <= 0}
            className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-medium px-3 min-w-[120px] text-center">
            {monthLabel(selectedMonth)}
          </span>
          <button
            onClick={() => selectedMonthIdx < availableMonths.length - 1 && setSelectedMonth(availableMonths[selectedMonthIdx + 1])}
            disabled={selectedMonthIdx >= availableMonths.length - 1}
            className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Collected</p>
              <p className="text-xl font-bold text-white">R {totalIncome.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{monthLabel(selectedMonth)}</p>
            </div>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Outstanding</p>
              <p className="text-xl font-bold text-white">R {totalOutstanding.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{monthLabel(selectedMonth)}</p>
            </div>
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Occupancy</p>
              <p className="text-xl font-bold text-white">{overallOccupancy}%</p>
              <p className="text-xs text-gray-500 mt-1">{totalOccupied}/{totalRooms} rooms</p>
            </div>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <DoorClosed className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Deposit Liability</p>
              <p className="text-xl font-bold text-white">R {totalDepositLiability.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Total held</p>
            </div>
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Recharts section ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

        {/* Chart 1 — 12-Month Revenue Overview */}
        <Card>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            12-Month Revenue Overview
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyTotals} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                tickFormatter={(v: number) => `R${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
                itemStyle={{ color: '#d1d5db' }}
                formatter={(value: number) => [`R${value.toLocaleString()}`, undefined]}
              />
              <Legend
                wrapperStyle={{ color: '#9ca3af', fontSize: 12 }}
              />
              <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Chart 2 — Facility Performance */}
        {facilitySummaries.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Facility Performance
            </h2>
            <ResponsiveContainer
              width="100%"
              height={Math.max(200, facilitySummaries.length * 52)}
            >
              <BarChart
                layout="vertical"
                data={facilitySummaries.map(f => ({
                  name: f.name,
                  occupiedRooms: f.occupiedRooms + f.lockedRooms,
                  occupancyRate: f.occupancyRate,
                  monthlyIncome: f.monthlyIncome,
                  totalRooms: f.totalRooms,
                }))}
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={{ stroke: '#374151' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
                  itemStyle={{ color: '#d1d5db' }}
                  formatter={(_value: number, _name: string, props: any) => {
                    const { occupancyRate, monthlyIncome, totalRooms, occupiedRooms } = props.payload;
                    return [
                      `${occupiedRooms}/${totalRooms} rooms (${occupancyRate}%) — R${monthlyIncome.toLocaleString()} income`,
                      'Occupancy',
                    ];
                  }}
                />
                <Bar dataKey="occupiedRooms" name="Occupied Rooms" fill="#3b82f6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Per-facility breakdown */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-400" />
          Facility Breakdown — {monthLabel(selectedMonth)}
        </h2>
        {facilitySummaries.length === 0 ? (
          <p className="text-gray-400 text-sm">No facilities found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 pr-4">Facility</th>
                  <th className="text-right py-2 px-4">Rooms</th>
                  <th className="text-right py-2 px-4">Occupancy</th>
                  <th className="text-right py-2 px-4">Collected</th>
                  <th className="text-right py-2 px-4">Outstanding</th>
                  <th className="text-right py-2 pl-4">Deposits Held</th>
                </tr>
              </thead>
              <tbody>
                {facilitySummaries.map(f => (
                  <tr key={f.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 pr-4 text-white font-medium">{f.name}</td>
                    <td className="py-3 px-4 text-right text-gray-300">{f.totalRooms}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${
                        f.occupancyRate >= 80 ? 'text-green-400' :
                        f.occupancyRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {f.occupancyRate}%
                      </span>
                      <span className="text-gray-500 ml-1 text-xs">
                        ({f.occupiedRooms + f.lockedRooms}/{f.totalRooms})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-green-400 font-medium">
                      R {f.monthlyIncome.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {f.outstandingRent > 0
                        ? <span className="text-red-400 font-medium">R {f.outstandingRent.toLocaleString()}</span>
                        : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-3 pl-4 text-right text-gray-300">
                      R {f.depositLiability.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-600 font-semibold">
                  <td className="py-3 pr-4 text-white">Total</td>
                  <td className="py-3 px-4 text-right text-white">{totalRooms}</td>
                  <td className="py-3 px-4 text-right text-white">{overallOccupancy}%</td>
                  <td className="py-3 px-4 text-right text-green-400">R {totalIncome.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-red-400">R {totalOutstanding.toLocaleString()}</td>
                  <td className="py-3 pl-4 text-right text-gray-300">R {totalDepositLiability.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Room status summary */}
      <Card>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DoorClosed className="w-5 h-5 text-purple-400" />
          Room Status Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Occupied', value: facilitySummaries.reduce((s, f) => s + f.occupiedRooms, 0), color: 'bg-green-500' },
            { label: 'Locked', value: facilitySummaries.reduce((s, f) => s + f.lockedRooms, 0), color: 'bg-red-500' },
            { label: 'Empty', value: facilitySummaries.reduce((s, f) => s + f.emptyRooms, 0), color: 'bg-yellow-500' },
            { label: 'Available', value: facilitySummaries.reduce((s, f) => s + f.availableRooms, 0), color: 'bg-blue-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-700/50 rounded-lg p-4 text-center">
              <div className={`w-3 h-3 rounded-full ${stat.color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Overdue accounts */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-red-400" />
            Overdue Accounts
            {allOverdue.length > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
                {allOverdue.length}
              </span>
            )}
          </h2>
          {allOverdue.length > 0 && (
            <Button variant="ghost" size="sm" onClick={exportOverdueCSV}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          )}
        </div>
        {allOverdue.length === 0 ? (
          <div className="flex items-center gap-2 text-green-400 py-4">
            <span className="text-lg">✓</span>
            <p className="text-sm">No overdue accounts — all rent is up to date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 pr-4">Room</th>
                  <th className="text-left py-2 px-4">Overdue Months</th>
                  <th className="text-right py-2 pl-4">Amount Owed</th>
                </tr>
              </thead>
              <tbody>
                {allOverdue.map((acct, i) => (
                  <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 pr-4 text-white font-medium">{acct.roomNumber}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {acct.monthsOverdue.map(m => (
                          <span key={m} className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded-full">
                            {monthLabel(m)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-right text-red-400 font-semibold">
                      R {acct.totalOwed.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-600 font-semibold">
                  <td className="py-3 pr-4 text-white">Total</td>
                  <td />
                  <td className="py-3 pl-4 text-right text-red-400">
                    R {allOverdue.reduce((s, a) => s + a.totalOwed, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;
