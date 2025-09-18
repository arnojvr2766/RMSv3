import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculatePaymentDueDate } from '../utils/paymentUtils';

// Types
export interface Facility {
  id?: string;
  name: string;
  address: string;
  billingEntity: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  defaultBusinessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  primaryColor: string;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Room {
  id?: string;
  facilityId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
  capacity: number;
  monthlyRent: number;
  depositAmount: number;
  amenities: string[];
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
    usesFacilityDefaults: boolean; // Track if using facility defaults or custom rules
  };
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  description?: string;
  floorLevel?: number;
  squareMeters?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    idNumber: string;
    dateOfBirth: Timestamp;
    phone: string;
    email: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  employment: {
    employer: string;
    position: string;
    monthlyIncome: number;
    workPhone?: string;
  };
  bankDetails: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    branchCode: string;
  };
  documents: {
    idCopy?: string;
    proofOfIncome?: string;
    bankStatement?: string;
  };
  status: 'active' | 'inactive' | 'blacklisted';
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface LeaseAgreement {
  id?: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  childrenCount?: number; // Number of children in the lease
  terms: {
    startDate: Timestamp;
    endDate: Timestamp;
    monthlyRent: number;
    depositAmount: number;
    depositPaid: boolean;
    depositPaidDate?: Timestamp; // Optional - only present if deposit is paid
  };
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  additionalTerms?: string;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentSchedule {
  id?: string;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  paymentDueDateSetting: 'first_day' | 'last_day'; // Field to track which setting was used
  payments: {
    month: string; // Format: "2024-09"
    dueDate: Timestamp;
    amount: number;
    type: 'rent' | 'deposit' | 'late_fee' | 'deposit_payout' | 'maintenance';
    status: 'pending' | 'paid' | 'overdue' | 'partial' | 'pending_approval';
    paidAmount?: number;
    paidDate?: Timestamp;
    lateFee?: number;
    paymentMethod?: string;
    editedBy?: string;
    editedAt?: Timestamp;
    originalValues?: {
      paidAmount?: number;
      paidDate?: Timestamp;
      paymentMethod?: string;
    };
  }[];
  // Aggregated penalty system
  aggregatedPenalty?: {
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    lastCalculated: Timestamp;
    calculationHistory: {
      date: Timestamp;
      amount: number;
      reason: string;
      paymentMonth: string;
    }[];
  };
  totalAmount: number;
  totalPaid: number;
  outstandingAmount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PaymentApproval {
  id?: string;
  paymentScheduleId: string;
  paymentIndex: number; // Index of the payment in the payments array
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  originalValues: {
    paidAmount?: number;
    paidDate?: Timestamp;
    paymentMethod?: string;
  };
  newValues: {
    paidAmount?: number;
    paidDate?: Timestamp;
    paymentMethod?: string;
  };
  editedBy: string;
  editedAt: Timestamp;
  status: 'pending' | 'approved' | 'declined';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DepositPayout {
  id?: string;
  leaseId: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  depositAmount: number;
  payoutAmount: number;
  deductionAmount: number;
  deductionReason?: string;
  maintenanceExpenses?: string[]; // Array of maintenance expense IDs
  payoutDate: Timestamp;
  payoutMethod: string;
  processedBy: string;
  status: 'pending' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MaintenanceExpense {
  id?: string;
  facilityId: string;
  roomIds: string[]; // Can be multiple rooms
  description: string;
  totalAmount: number;
  costSplitType: 'equal' | 'custom';
  roomCosts: {
    roomId: string;
    amount: number;
    recoverFromDeposit: boolean;
  }[];
  expenseDate: Timestamp;
  processedBy: string;
  status: 'pending' | 'completed';
  attachments?: string[]; // File URLs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Facility Services
export const facilityService = {
  // Create a new facility
  async createFacility(facilityData: Omit<Facility, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, 'facilities'), {
        ...facilityData,
        createdAt: now,
        updatedAt: now,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating facility:', error);
      throw error;
    }
  },

  // Get all facilities
  async getFacilities(): Promise<Facility[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'facilities'), orderBy('createdAt', 'desc'))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Facility[];
    } catch (error) {
      console.error('Error getting facilities:', error);
      throw error;
    }
  },

  // Update a facility
  async updateFacility(facilityId: string, updates: Partial<Facility>): Promise<void> {
    try {
      const facilityRef = doc(db, 'facilities', facilityId);
      await updateDoc(facilityRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating facility:', error);
      throw error;
    }
  },

  // Delete a facility
  async deleteFacility(facilityId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'facilities', facilityId));
    } catch (error) {
      console.error('Error deleting facility:', error);
      throw error;
    }
  },

  // Migration utility: Update facility from old settings structure to new defaultBusinessRules
  async migrateFacilityBusinessRules(id: string): Promise<void> {
    try {
      const facilityRef = doc(db, 'facilities', id);
      const facilityDoc = await getDoc(facilityRef);
      
      if (facilityDoc.exists()) {
        const data = facilityDoc.data() as any;
        
        // Check if facility has old 'settings' structure but no 'defaultBusinessRules'
        if (data.settings && !data.defaultBusinessRules) {
          const updateData = {
            defaultBusinessRules: {
              lateFeeAmount: data.settings.lateFeeAmount || 20,
              lateFeeStartDay: data.settings.lateFeeStartDay || 4,
              childSurcharge: data.settings.childSurcharge || 10,
              gracePeriodDays: data.settings.gracePeriodDays || 7,
              paymentMethods: data.settings.paymentMethods || ['cash', 'eft', 'mobile', 'card'],
            },
            updatedAt: Timestamp.now(),
          };
          
          await updateDoc(facilityRef, updateData);
          console.log(`Migrated facility ${id} to new business rules structure`);
        }
      }
    } catch (error) {
      console.error(`Error migrating facility ${id}:`, error);
    }
  },

  // Migrate all facilities from old structure to new structure
  async migrateAllFacilities(): Promise<void> {
    try {
      const facilities = await this.getFacilities();
      const migrationPromises = facilities.map(facility => 
        facility.id ? this.migrateFacilityBusinessRules(facility.id) : Promise.resolve()
      );
      await Promise.all(migrationPromises);
      console.log('Completed migration of all facilities');
    } catch (error) {
      console.error('Error during facility migration:', error);
    }
  }
};

// Room Services
export const roomService = {
  // Create a new room
  async createRoom(roomData: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Creating room with data:', roomData);
      
      // Clean the data to remove any undefined values
      const cleanedData = Object.fromEntries(
        Object.entries(roomData).filter(([_, value]) => value !== undefined)
      );
      
      console.log('Cleaned room data:', cleanedData);
      
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, 'rooms'), {
        ...cleanedData,
        createdAt: now,
        updatedAt: now,
      });
      console.log('Room created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating room:', error);
      console.error('Room data that failed:', roomData);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },

  // Get rooms by facility
  async getRoomsByFacility(facilityId: string): Promise<Room[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'rooms'),
          where('facilityId', '==', facilityId)
        )
      );
      const rooms = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      
      // Sort in memory instead of using Firestore orderBy to avoid index issues
      return rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
    } catch (error) {
      console.error('Error getting rooms:', error);
      throw error;
    }
  },

  // Alias for getRoomsByFacility to match the calling code
  async getRooms(facilityId: string): Promise<Room[]> {
    return this.getRoomsByFacility(facilityId);
  },

  // Update an existing room
  async updateRoom(id: string, roomData: Partial<Omit<Room, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const roomRef = doc(db, 'rooms', id);
      await updateDoc(roomRef, {
        ...roomData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  },

  // Delete a room
  async deleteRoom(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'rooms', id));
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  },

  // Get all rooms
  async getAllRooms(): Promise<Room[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'rooms'), orderBy('roomNumber', 'asc'))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
    } catch (error) {
      console.error('Error getting all rooms:', error);
      throw error;
    }
  },

  // Get room by ID
  async getRoomById(roomId: string): Promise<Room | null> {
    try {
      const docRef = doc(db, 'rooms', roomId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Room;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting room by ID:', error);
      throw error;
    }
  }
};

// Renter Services
export const renterService = {
  // Create a new renter
  async createRenter(renterData: Omit<Renter, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Creating renter with data:', renterData);
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, 'renters'), {
        ...renterData,
        createdAt: now,
        updatedAt: now,
      });
      console.log('Renter created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating renter:', error);
      throw error;
    }
  },

  // Get all renters
  async getAllRenters(): Promise<Renter[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'renters'), orderBy('personalInfo.lastName', 'asc'))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Renter[];
    } catch (error) {
      console.error('Error getting renters:', error);
      throw error;
    }
  },

  // Get renter by ID
  async getRenterById(renterId: string): Promise<Renter | null> {
    try {
      const docRef = doc(db, 'renters', renterId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Renter;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting renter by ID:', error);
      throw error;
    }
  },

  // Search renters by name, ID number, or email
  async searchRenters(searchTerm: string): Promise<Renter[]> {
    try {
      const allRenters = await this.getAllRenters();
      const searchLower = searchTerm.toLowerCase();
      
      return allRenters.filter(renter => 
        renter.personalInfo.firstName.toLowerCase().includes(searchLower) ||
        renter.personalInfo.lastName.toLowerCase().includes(searchLower) ||
        renter.personalInfo.email.toLowerCase().includes(searchLower) ||
        renter.personalInfo.idNumber.includes(searchTerm) ||
        renter.personalInfo.phone.includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching renters:', error);
      throw error;
    }
  },

  // Update an existing renter
  async updateRenter(id: string, renterData: Partial<Omit<Renter, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const renterRef = doc(db, 'renters', id);
      await updateDoc(renterRef, {
        ...renterData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating renter:', error);
      throw error;
    }
  },

  // Delete a renter
  async deleteRenter(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'renters', id));
    } catch (error) {
      console.error('Error deleting renter:', error);
      throw error;
    }
  },
};

// Lease Services
export const leaseService = {
  // Create a new lease agreement
  async createLease(leaseData: Omit<LeaseAgreement, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Creating lease with data:', leaseData);
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, 'leases'), {
        ...leaseData,
        createdAt: now,
        updatedAt: now,
      });
      console.log('Lease created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating lease:', error);
      throw error;
    }
  },

  // Get all leases
  async getAllLeases(): Promise<LeaseAgreement[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'leases'), orderBy('createdAt', 'desc'))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaseAgreement[];
    } catch (error) {
      console.error('Error getting leases:', error);
      throw error;
    }
  },

  // Get leases by facility
  async getLeasesByFacility(facilityId: string): Promise<LeaseAgreement[]> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'leases'),
          where('facilityId', '==', facilityId),
          orderBy('createdAt', 'desc')
        )
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaseAgreement[];
    } catch (error) {
      console.error('Error getting leases by facility:', error);
      throw error;
    }
  },

  // Get lease by ID
  async getLeaseById(leaseId: string): Promise<LeaseAgreement | null> {
    try {
      const docRef = doc(db, 'leases', leaseId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as LeaseAgreement;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting lease by ID:', error);
      throw error;
    }
  },

  // Get lease by room
  async getLeaseByRoom(roomId: string): Promise<LeaseAgreement | null> {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'leases'),
          where('roomId', '==', roomId),
          where('status', '==', 'active')
        )
      );
      
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as LeaseAgreement;
    } catch (error) {
      console.error('Error getting lease by room:', error);
      throw error;
    }
  },

  // Update lease status
  async updateLeaseStatus(id: string, status: 'active' | 'expired' | 'terminated' | 'pending'): Promise<void> {
    try {
      const leaseRef = doc(db, 'leases', id);
      await updateDoc(leaseRef, {
        status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating lease status:', error);
      throw error;
    }
  },
};

// Payment Schedule Services
export const paymentScheduleService = {
  // Create payment schedule
  async createPaymentSchedule(scheduleData: Omit<PaymentSchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Creating payment schedule with data:', scheduleData);
      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, 'payment_schedules'), {
        ...scheduleData,
        createdAt: now,
        updatedAt: now,
      });
      console.log('Payment schedule created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating payment schedule:', error);
      throw error;
    }
  },

  // Get payment schedule by lease
  async getPaymentScheduleByLease(leaseId: string): Promise<PaymentSchedule | null> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'payment_schedules'), where('leaseId', '==', leaseId))
      );
      
      if (querySnapshot.empty) return null;
      
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as PaymentSchedule;
    } catch (error) {
      console.error('Error getting payment schedule by lease:', error);
      throw error;
    }
  },

  // Get all payment schedules
  async getAllPaymentSchedules(): Promise<PaymentSchedule[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'payment_schedules'), orderBy('createdAt', 'desc'))
      );
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PaymentSchedule[];
    } catch (error) {
      console.error('Error getting all payment schedules:', error);
      throw error;
    }
  },

  // Update payment in schedule
  async updatePaymentInSchedule(scheduleId: string, monthKey: string, paymentUpdate: any, editedBy?: string): Promise<void> {
    try {
      console.log('updatePaymentInSchedule called with:', { scheduleId, monthKey, paymentUpdate, editedBy });
      
      const scheduleRef = doc(db, 'payment_schedules', scheduleId);
      const scheduleDoc = await getDoc(scheduleRef);
      
      if (!scheduleDoc.exists()) {
        throw new Error('Payment schedule not found');
      }
      
      const scheduleData = scheduleDoc.data() as PaymentSchedule;
      console.log('Schedule data:', scheduleData);
      console.log('Schedule payments:', scheduleData.payments);
      
      const updatedPayments = scheduleData.payments.map(payment => {
        if (payment.month === monthKey) {
          // Store original values if this is an edit
          const originalValues = editedBy ? {
            paidAmount: payment.paidAmount,
            paidDate: payment.paidDate,
            paymentMethod: payment.paymentMethod,
          } : payment.originalValues;
          
      // Clean the payment update to remove undefined values
      const cleanedPaymentUpdate = Object.fromEntries(
        Object.entries(paymentUpdate).filter(([_, value]) => value !== undefined)
      );
      
      console.log('Original payment update:', paymentUpdate);
      console.log('Cleaned payment update:', cleanedPaymentUpdate);
      console.log('Schedule ID:', scheduleId);
      console.log('Month Key:', monthKey);
          
          const updatedPayment = {
            ...payment,
            ...cleanedPaymentUpdate,
            editedBy: editedBy || payment.editedBy,
            editedAt: editedBy ? Timestamp.now() : payment.editedAt,
          };

          // Only add originalValues if it exists
          if (originalValues) {
            updatedPayment.originalValues = originalValues;
          }

          return updatedPayment;
        }
        return payment;
      });
      
      // Recalculate totals
      const totalPaid = updatedPayments.reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
      const outstandingAmount = scheduleData.totalAmount - totalPaid;
      
      console.log('Updated payments:', updatedPayments);
      
      // Check each payment for undefined values
      updatedPayments.forEach((payment, index) => {
        console.log(`Payment ${index}:`, payment);
        Object.entries(payment).forEach(([key, value]) => {
          if (value === undefined) {
            console.error(`UNDEFINED VALUE FOUND: Payment ${index}, field: ${key}, value: ${value}`);
          }
        });
      });
      
      console.log('Total paid:', totalPaid);
      console.log('Outstanding amount:', outstandingAmount);
      
      // Clean the entire payments array to remove any undefined values
      const cleanedPayments = updatedPayments.map(payment => {
        const cleanedPayment: any = {};
        Object.entries(payment).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanedPayment[key] = value;
          }
        });
        return cleanedPayment;
      });
      
      console.log('Cleaned payments:', cleanedPayments);
      
      const updateData = {
        payments: cleanedPayments,
        totalPaid,
        outstandingAmount,
        updatedAt: Timestamp.now(),
      };
      
      console.log('Update data being sent to Firestore:', updateData);
      
      await updateDoc(scheduleRef, updateData);
    } catch (error) {
      console.error('Error updating payment in schedule:', error);
      throw error;
    }
  },

  // Create payment approval request
  async createPaymentApproval(
    scheduleId: string,
    monthKey: string,
    originalValues: any,
    newValues: any,
    editedBy: string
  ): Promise<string> {
    try {
      console.log('Creating payment approval with:', { scheduleId, monthKey, originalValues, newValues, editedBy });
      const scheduleRef = doc(db, 'payment_schedules', scheduleId);
      const scheduleDoc = await getDoc(scheduleRef);
      
      if (!scheduleDoc.exists()) {
        throw new Error('Payment schedule not found');
      }
      
      const scheduleData = scheduleDoc.data() as PaymentSchedule;
      const paymentIndex = scheduleData.payments.findIndex(p => p.month === monthKey);
      
      if (paymentIndex === -1) {
        throw new Error('Payment not found');
      }
      
      const approvalData: Omit<PaymentApproval, 'id' | 'createdAt' | 'updatedAt'> = {
        paymentScheduleId: scheduleId,
        paymentIndex,
        leaseId: scheduleData.leaseId,
        facilityId: scheduleData.facilityId,
        roomId: scheduleData.roomId,
        renterId: scheduleData.renterId,
        originalValues,
        newValues,
        editedBy,
        editedAt: Timestamp.now(),
        status: 'pending',
      };
      
      const docRef = await addDoc(collection(db, 'payment_approvals'), {
        ...approvalData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating payment approval:', error);
      throw error;
    }
  },

  // Get all pending payment approvals
  async getPendingPaymentApprovals(): Promise<PaymentApproval[]> {
    try {
      const q = query(
        collection(db, 'payment_approvals'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PaymentApproval[];
    } catch (error) {
      console.error('Error getting pending payment approvals:', error);
      throw error;
    }
  },

  // Remove a payment (System Admin only)
  async removePayment(
    scheduleId: string,
    monthKey: string,
    removedBy: string
  ): Promise<void> {
    try {
      console.log('Removing payment:', { scheduleId, monthKey, removedBy });
      const scheduleRef = doc(db, 'payment_schedules', scheduleId);
      const scheduleDoc = await getDoc(scheduleRef);
      
      if (!scheduleDoc.exists()) {
        throw new Error('Payment schedule not found');
      }
      
      const scheduleData = scheduleDoc.data() as PaymentSchedule;
      const updatedPayments = scheduleData.payments.map(payment => {
        if (payment.month === monthKey) {
          return {
            ...payment,
            paidAmount: 0,
            paymentMethod: '',
            status: 'pending',
            editedBy: removedBy,
            editedAt: Timestamp.now(),
            originalValues: {
              paidAmount: payment.paidAmount,
              paidDate: payment.paidDate,
              paymentMethod: payment.paymentMethod,
            },
          };
        }
        return payment;
      });
      
      // Recalculate totals
      const totalPaid = updatedPayments.reduce((sum, payment) => sum + (payment.paidAmount || 0), 0);
      const outstandingAmount = scheduleData.totalAmount - totalPaid;
      
      await updateDoc(scheduleRef, {
        payments: updatedPayments,
        totalPaid,
        outstandingAmount,
        updatedAt: Timestamp.now(),
      });
      
      console.log('Payment removed successfully');
    } catch (error) {
      console.error('Error removing payment:', error);
      throw error;
    }
  },

  // Approve or decline a payment approval
  async reviewPaymentApproval(
    approvalId: string,
    decision: 'approved' | 'declined',
    reviewedBy: string,
    reviewNotes?: string
  ): Promise<void> {
    try {
      const approvalRef = doc(db, 'payment_approvals', approvalId);
      const approvalDoc = await getDoc(approvalRef);
      
      if (!approvalDoc.exists()) {
        throw new Error('Payment approval not found');
      }
      
      const approvalData = approvalDoc.data() as PaymentApproval;
      
      // Get the payment schedule to find the month key
      const scheduleRef = doc(db, 'payment_schedules', approvalData.paymentScheduleId);
      const scheduleDoc = await getDoc(scheduleRef);
      
      if (!scheduleDoc.exists()) {
        throw new Error('Payment schedule not found');
      }
      
      const scheduleData = scheduleDoc.data() as PaymentSchedule;
      const monthKey = scheduleData.payments[approvalData.paymentIndex].month;
      
      if (decision === 'approved') {
        // Apply the changes to the payment schedule
        await this.updatePaymentInSchedule(
          approvalData.paymentScheduleId,
          monthKey,
          approvalData.newValues
        );
      } else {
        // Revert to original values
        await this.updatePaymentInSchedule(
          approvalData.paymentScheduleId,
          monthKey,
          approvalData.originalValues
        );
      }
      
      // Update the approval status
      await updateDoc(approvalRef, {
        status: decision,
        reviewedBy,
        reviewedAt: Timestamp.now(),
        reviewNotes,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error reviewing payment approval:', error);
      throw error;
    }
  },
};

// Utility function to generate payment schedule
export const generatePaymentSchedule = (
  leaseData: LeaseAgreement,
  includeDeposit: boolean = true,
  paymentDueDate: 'first_day' | 'last_day' = 'first_day'
): Omit<PaymentSchedule, 'id' | 'createdAt' | 'updatedAt'> => {
  // Convert Timestamp to Date for processing
  const startDate = leaseData.terms.startDate instanceof Timestamp 
    ? leaseData.terms.startDate.toDate() 
    : new Date(leaseData.terms.startDate);
  const endDate = leaseData.terms.endDate instanceof Timestamp 
    ? leaseData.terms.endDate.toDate() 
    : new Date(leaseData.terms.endDate);
    
  const payments = [];
  let totalAmount = 0;

  // Add deposit payment if needed
  if (includeDeposit) {
    const depositPayment: any = {
      month: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-deposit`,
      dueDate: Timestamp.fromDate(startDate),
      amount: leaseData.terms.depositAmount,
      type: 'deposit' as const,
      status: leaseData.terms.depositPaid ? 'paid' as const : 'pending' as const,
    };

    // If deposit is paid, add payment details
    if (leaseData.terms.depositPaid) {
      depositPayment.paidAmount = leaseData.terms.depositAmount;
      depositPayment.paidDate = leaseData.terms.depositPaidDate || Timestamp.fromDate(startDate);
      depositPayment.paymentMethod = (leaseData as any).depositPaymentMethod || 'cash';
    }

    payments.push(depositPayment);
    totalAmount += leaseData.terms.depositAmount;
  }

  // Generate monthly rent payments
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Calculate due date based on setting
    const dueDate = calculatePaymentDueDate(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      paymentDueDate
    );
    
    payments.push({
      month: monthKey,
      dueDate: Timestamp.fromDate(dueDate),
      amount: leaseData.terms.monthlyRent,
      type: 'rent' as const,
      status: 'pending' as const,
    });
    
    totalAmount += leaseData.terms.monthlyRent;
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Calculate total paid amount (for deposits that are already paid)
  const totalPaid = payments.reduce((sum, payment) => {
    return sum + (payment.paidAmount || 0);
  }, 0);

  return {
    leaseId: leaseData.id!,
    facilityId: leaseData.facilityId,
    roomId: leaseData.roomId,
    renterId: leaseData.renterId,
    paymentDueDateSetting: paymentDueDate, // Store the setting used
    payments,
    totalAmount,
    totalPaid,
    outstandingAmount: totalAmount - totalPaid,
  };
};

// Deposit Payout Services
export const depositPayoutService = {
  // Create deposit payout
  async createDepositPayout(payoutData: Omit<DepositPayout, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'deposit_payouts'), {
        ...payoutData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating deposit payout:', error);
      throw error;
    }
  },

  // Get deposit payouts by lease
  async getDepositPayoutsByLease(leaseId: string): Promise<DepositPayout[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'deposit_payouts'), where('leaseId', '==', leaseId))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as DepositPayout[];
    } catch (error) {
      console.error('Error getting deposit payouts:', error);
      throw error;
    }
  },

  // Update deposit payout status
  async updateDepositPayoutStatus(payoutId: string, status: 'pending' | 'completed'): Promise<void> {
    try {
      const payoutRef = doc(db, 'deposit_payouts', payoutId);
      await updateDoc(payoutRef, {
        status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating deposit payout status:', error);
      throw error;
    }
  },
};

// Maintenance Expense Services
export const maintenanceExpenseService = {
  // Create maintenance expense
  async createMaintenanceExpense(expenseData: Omit<MaintenanceExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'maintenance_expenses'), {
        ...expenseData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating maintenance expense:', error);
      throw error;
    }
  },

  // Get maintenance expenses by facility
  async getMaintenanceExpensesByFacility(facilityId: string): Promise<MaintenanceExpense[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'maintenance_expenses'), where('facilityId', '==', facilityId))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as MaintenanceExpense[];
    } catch (error) {
      console.error('Error getting maintenance expenses:', error);
      throw error;
    }
  },

  // Get maintenance expenses by room
  async getMaintenanceExpensesByRoom(roomId: string): Promise<MaintenanceExpense[]> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'maintenance_expenses'), where('roomIds', 'array-contains', roomId))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as MaintenanceExpense[];
    } catch (error) {
      console.error('Error getting maintenance expenses by room:', error);
      throw error;
    }
  },

  // Update maintenance expense
  async updateMaintenanceExpense(expenseId: string, updateData: Partial<MaintenanceExpense>): Promise<void> {
    try {
      const expenseRef = doc(db, 'maintenance_expenses', expenseId);
      await updateDoc(expenseRef, {
        ...updateData,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating maintenance expense:', error);
      throw error;
    }
  },

  // Delete maintenance expense
  async deleteMaintenanceExpense(expenseId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'maintenance_expenses', expenseId));
    } catch (error) {
      console.error('Error deleting maintenance expense:', error);
      throw error;
    }
  },
};
