import { 
  collection, 
  query, 
  getDocs, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface DashboardMetrics {
  // Financial Metrics
  totalMonthlyRevenue: number;
  totalOutstandingAmount: number;
  totalPaidAmount: number;
  averageRentPerRoom: number;
  revenueGrowth: number;
  
  // Property Metrics
  totalFacilities: number;
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  occupancyRate: number;
  
  // Tenant Metrics
  totalActiveTenants: number;
  totalPendingTenants: number;
  averageTenantIncome: number;
  
  // Payment Metrics
  overduePayments: number;
  overdueAmount: number;
  pendingPayments: number;
  pendingAmount: number;
  paymentCollectionRate: number;
  
  // System Metrics
  totalUsers: number;
  activeUsers: number;
  systemUptime: number;
  
  // Recent Activity
  recentPayments: any[];
  recentLeases: any[];
  recentActivities: any[];
}

export interface FacilityPerformance {
  facilityId: string;
  facilityName: string;
  totalRooms: number;
  occupiedRooms: number;
  monthlyRevenue: number;
  occupancyRate: number;
  averageRent: number;
  overduePayments: number;
}

export interface PaymentTrends {
  monthly: { month: string; amount: number; count: number }[];
  weekly: { week: string; amount: number; count: number }[];
  daily: { day: string; amount: number; count: number }[];
}

export interface TenantInsights {
  incomeDistribution: { range: string; count: number }[];
  employmentSectors: { sector: string; count: number }[];
  averageTenure: number;
  tenantSatisfaction: number;
}

class DashboardService {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      // Get all collections data
      const [facilities, rooms, renters, paymentSchedules, leases, users] = await Promise.all([
        this.getCollectionData('facilities'),
        this.getCollectionData('rooms'),
        this.getCollectionData('renters'),
        this.getCollectionData('payment_schedules'),
        this.getCollectionData('leases'),
        this.getCollectionData('users')
      ]);

      // Calculate metrics
      const totalFacilities = facilities.length;
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter((room: any) => room.status === 'occupied').length;
      const availableRooms = totalRooms - occupiedRooms;
      const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

      // Financial calculations
      const totalMonthlyRevenue = rooms
        .filter((room: any) => room.status === 'occupied')
        .reduce((sum: number, room: any) => sum + (room.monthlyRent || 0), 0);

      const totalOutstandingAmount = paymentSchedules.reduce(
        (sum: number, schedule: any) => sum + (schedule.outstandingAmount || 0), 0
      );

      const totalPaidAmount = paymentSchedules.reduce(
        (sum: number, schedule: any) => sum + (schedule.totalPaid || 0), 0
      );

      const averageRentPerRoom = occupiedRooms > 0 ? totalMonthlyRevenue / occupiedRooms : 0;

      // Payment metrics
      let overduePayments = 0;
      let overdueAmount = 0;
      let pendingPayments = 0;
      let pendingAmount = 0;

      paymentSchedules.forEach((schedule: any) => {
        if (schedule.payments) {
          schedule.payments.forEach((payment: any) => {
            if (payment.status === 'overdue') {
              overduePayments++;
              overdueAmount += payment.amount || 0;
            } else if (payment.status === 'pending') {
              pendingPayments++;
              pendingAmount += payment.amount || 0;
            }
          });
        }
      });

      const paymentCollectionRate = totalPaidAmount > 0 
        ? (totalPaidAmount / (totalPaidAmount + totalOutstandingAmount)) * 100 
        : 0;

      // Tenant metrics
      const totalActiveTenants = renters.filter((renter: any) => renter.status === 'active').length;
      const totalPendingTenants = renters.filter((renter: any) => renter.status === 'pending').length;
      const averageTenantIncome = renters.length > 0 
        ? renters.reduce((sum: number, renter: any) => sum + (renter.employment?.monthlyIncome || 0), 0) / renters.length
        : 0;

      // System metrics
      const totalUsers = users.length;
      const activeUsers = users.filter((user: any) => user.status === 'active').length;

      // Recent activity
      const recentPayments = await this.getRecentPayments();
      const recentLeases = await this.getRecentLeases();
      const recentActivities = await this.getRecentActivities();

      return {
        totalMonthlyRevenue,
        totalOutstandingAmount,
        totalPaidAmount,
        averageRentPerRoom,
        revenueGrowth: 12.5, // Mock data - would calculate from historical data
        totalFacilities,
        totalRooms,
        occupiedRooms,
        availableRooms,
        occupancyRate,
        totalActiveTenants,
        totalPendingTenants,
        averageTenantIncome,
        overduePayments,
        overdueAmount,
        pendingPayments,
        pendingAmount,
        paymentCollectionRate,
        totalUsers,
        activeUsers,
        systemUptime: 99.9, // Mock data
        recentPayments,
        recentLeases,
        recentActivities
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  }

  async getFacilityPerformance(): Promise<FacilityPerformance[]> {
    try {
      const [facilities, rooms, paymentSchedules] = await Promise.all([
        this.getCollectionData('facilities'),
        this.getCollectionData('rooms'),
        this.getCollectionData('payment_schedules')
      ]);

      return facilities.map((facility: any) => {
        const facilityRooms = rooms.filter((room: any) => room.facilityId === facility.__path__.split('/')[1]);
        const occupiedRooms = facilityRooms.filter((room: any) => room.status === 'occupied');
        const monthlyRevenue = occupiedRooms.reduce((sum: number, room: any) => sum + (room.monthlyRent || 0), 0);
        const occupancyRate = facilityRooms.length > 0 ? (occupiedRooms.length / facilityRooms.length) * 100 : 0;
        const averageRent = occupiedRooms.length > 0 ? monthlyRevenue / occupiedRooms.length : 0;

        // Count overdue payments for this facility
        const facilityPaymentSchedules = paymentSchedules.filter(
          (schedule: any) => schedule.facilityId === facility.__path__.split('/')[1]
        );
        
        let overduePayments = 0;
        facilityPaymentSchedules.forEach((schedule: any) => {
          if (schedule.payments) {
            schedule.payments.forEach((payment: any) => {
              if (payment.status === 'overdue') {
                overduePayments++;
              }
            });
          }
        });

        return {
          facilityId: facility.__path__.split('/')[1],
          facilityName: facility.name,
          totalRooms: facilityRooms.length,
          occupiedRooms: occupiedRooms.length,
          monthlyRevenue,
          occupancyRate,
          averageRent,
          overduePayments
        };
      });
    } catch (error) {
      console.error('Error fetching facility performance:', error);
      throw error;
    }
  }

  async getPaymentTrends(): Promise<PaymentTrends> {
    try {
      const paymentSchedules = await this.getCollectionData('payment_schedules');
      
      // Mock data for trends - in real implementation, you'd analyze historical payment data
      const monthly = [
        { month: 'Jan 2025', amount: 45000, count: 45 },
        { month: 'Feb 2025', amount: 48000, count: 48 },
        { month: 'Mar 2025', amount: 52000, count: 52 },
        { month: 'Apr 2025', amount: 51000, count: 51 },
        { month: 'May 2025', amount: 55000, count: 55 },
        { month: 'Jun 2025', amount: 58000, count: 58 },
        { month: 'Jul 2025', amount: 62000, count: 62 },
        { month: 'Aug 2025', amount: 65000, count: 65 },
        { month: 'Sep 2025', amount: 68000, count: 68 }
      ];

      const weekly = [
        { week: 'Week 1', amount: 15000, count: 15 },
        { week: 'Week 2', amount: 18000, count: 18 },
        { week: 'Week 3', amount: 22000, count: 22 },
        { week: 'Week 4', amount: 25000, count: 25 }
      ];

      const daily = [
        { day: 'Mon', amount: 3500, count: 3 },
        { day: 'Tue', amount: 4200, count: 4 },
        { day: 'Wed', amount: 3800, count: 3 },
        { day: 'Thu', amount: 5100, count: 5 },
        { day: 'Fri', amount: 4800, count: 4 },
        { day: 'Sat', amount: 2100, count: 2 },
        { day: 'Sun', amount: 1800, count: 1 }
      ];

      return { monthly, weekly, daily };
    } catch (error) {
      console.error('Error fetching payment trends:', error);
      throw error;
    }
  }

  async getTenantInsights(): Promise<TenantInsights> {
    try {
      const renters = await this.getCollectionData('renters');
      
      // Income distribution
      const incomeDistribution = [
        { range: 'R0 - R5,000', count: 0 },
        { range: 'R5,000 - R10,000', count: 0 },
        { range: 'R10,000 - R15,000', count: 0 },
        { range: 'R15,000 - R20,000', count: 0 },
        { range: 'R20,000+', count: 0 }
      ];

      renters.forEach((renter: any) => {
        const income = renter.employment?.monthlyIncome || 0;
        if (income < 5000) incomeDistribution[0].count++;
        else if (income < 10000) incomeDistribution[1].count++;
        else if (income < 15000) incomeDistribution[2].count++;
        else if (income < 20000) incomeDistribution[3].count++;
        else incomeDistribution[4].count++;
      });

      // Employment sectors
      const employmentSectors: { [key: string]: number } = {};
      renters.forEach((renter: any) => {
        const employer = renter.employment?.employer || 'Unknown';
        employmentSectors[employer] = (employmentSectors[employer] || 0) + 1;
      });

      const employmentSectorsArray = Object.entries(employmentSectors).map(([sector, count]) => ({
        sector,
        count
      }));

      return {
        incomeDistribution,
        employmentSectors: employmentSectorsArray,
        averageTenure: 8.5, // Mock data
        tenantSatisfaction: 4.2 // Mock data
      };
    } catch (error) {
      console.error('Error fetching tenant insights:', error);
      throw error;
    }
  }

  private async getCollectionData(collectionName: string) {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    return snapshot.docs.map(doc => ({ ...doc.data(), __path__: doc.ref.path }));
  }

  private async getRecentPayments() {
    try {
      const schedulesRef = collection(db, 'payment_schedules');
      const snapshot = await getDocs(schedulesRef);

      const payments: any[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.payments && Array.isArray(data.payments)) {
          data.payments.forEach((p: any) => {
            if (p.paidDate || p.status === 'paid' || p.status === 'partial') {
              payments.push({
                id: `${doc.id}-${p.month}`,
                room: data.roomNumber || data.roomId || '—',
                tenant: data.renterName || data.renterId || '—',
                amount: p.paidAmount || p.amount || 0,
                status: p.status,
                date: p.paidDate?.toDate?.().toISOString().split('T')[0] || '',
                method: p.paymentMethod || '',
              });
            }
          });
        }
      });

      // Sort by date descending and return most recent 10
      return payments
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 10);
    } catch {
      return [];
    }
  }

  private async getRecentLeases() {
    try {
      const leasesRef = collection(db, 'leases');
      const q = query(leasesRef, orderBy('createdAt', 'desc'), limit(5));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          room: data.roomId || '—',
          tenant: data.renterId || '—',
          startDate: data.terms?.startDate?.toDate?.().toISOString().split('T')[0] || '',
          rent: data.terms?.monthlyRent || 0,
          status: data.status || 'active',
        };
      });
    } catch {
      return [];
    }
  }

  private async getRecentActivities() {
    // Build a combined activity feed from real data
    try {
      const [payments, leases] = await Promise.all([
        this.getRecentPayments(),
        this.getRecentLeases(),
      ]);

      const activities: any[] = [
        ...payments.slice(0, 3).map(p => ({
          id: p.id,
          type: 'payment',
          message: `Payment of R${p.amount?.toLocaleString()} for Room ${p.room}`,
          time: p.date || '',
        })),
        ...leases.slice(0, 2).map(l => ({
          id: l.id,
          type: 'lease',
          message: `Lease for Room ${l.room} — R${l.rent?.toLocaleString()}/mo`,
          time: l.startDate || '',
        })),
      ];

      return activities.sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, 5);
    } catch {
      return [];
    }
  }
}

export const dashboardService = new DashboardService();
