import React, { useState } from 'react';
import { Database, Trash2, RefreshCw, X, AlertTriangle, CheckCircle, Calculator } from 'lucide-react';
import Button from '../ui/Button';
import { 
  facilityService, 
  roomService, 
  renterService, 
  leaseService, 
  paymentScheduleService
} from '../../services/firebaseService';
import { aggregatedPenaltyService } from '../../services/aggregatedPenaltyService';
import { Timestamp, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface DataManagementProps {
  onClose: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ onClose }) => {
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [clearComplete, setClearComplete] = useState(false);
  const [seedComplete, setSeedComplete] = useState(false);

  // Clear all data
  const handleClearData = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL data including facilities, rooms, renters, leases, and payments. This action cannot be undone. Are you sure?')) {
      return;
    }

    setIsClearing(true);
    setClearComplete(false);

    try {
      console.log('Clearing all data...');
      
      // Collections to clear
      const collections = [
        'payment_schedules',
        'payment_approvals', 
        'deposit_payouts',
        'maintenance_expenses',
        'leases',
        'renters',
        'rooms',
        'facilities'
      ];

      let totalDeleted = 0;

      for (const collectionName of collections) {
        try {
          console.log(`Clearing collection: ${collectionName}`);
          const querySnapshot = await getDocs(collection(db, collectionName));
          
          // Delete documents in batches to avoid rate limits
          const deletePromises = querySnapshot.docs.map(docSnapshot => 
            deleteDoc(doc(db, collectionName, docSnapshot.id))
          );
          
          await Promise.all(deletePromises);
          totalDeleted += querySnapshot.size;
          console.log(`Deleted ${querySnapshot.size} documents from ${collectionName}`);
        } catch (error) {
          console.error(`Error clearing collection ${collectionName}:`, error);
        }
      }
      
      console.log(`Successfully deleted ${totalDeleted} documents total`);
      setClearComplete(true);
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  // Clear user data (except admin)
  const handleClearUserData = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL user data except the admin user. This action cannot be undone. Are you sure?')) {
      return;
    }

    setIsClearing(true);
    setClearComplete(false);

    try {
      console.log('Clearing user data (preserving admin)...');
      
      // Get all users from Firestore
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      let deletedCount = 0;
      const deletePromises = [];

      for (const docSnapshot of usersSnapshot.docs) {
        const userData = docSnapshot.data();
        
        // Skip admin user
        if (userData.email === 'admin@unitra.com') {
          console.log('Preserving admin user:', userData.email);
          continue;
        }
        
        // Delete user document
        deletePromises.push(deleteDoc(doc(db, 'users', docSnapshot.id)));
        deletedCount++;
        console.log(`Marked for deletion: ${userData.email}`);
      }
      
      // Execute deletions
      await Promise.all(deletePromises);
      
      console.log(`Successfully deleted ${deletedCount} user documents`);
      setClearComplete(true);
    } catch (error) {
      console.error('Error clearing user data:', error);
      alert('Failed to clear user data. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleCalculatePenalties = async () => {
    try {
      setIsSeeding(true);
      console.log('Starting penalty calculation...');
      
      // Calculate daily penalties for all active leases
      await aggregatedPenaltyService.calculateDailyPenalties();
      alert('Penalty calculation completed! Check the payment transactions to see aggregated penalties.');
      
    } catch (error) {
      console.error('Error calculating penalties:', error);
      alert('Failed to calculate penalties. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Seed test data
  const handleSeedData = async () => {
    if (!confirm('This will create test data including 3 facilities, 9 rooms, renters, and lease agreements. Continue?')) {
      return;
    }

    setIsSeeding(true);
    setSeedComplete(false);

    try {
      console.log('Creating test data...');

      // Create 5 facilities in KZN area (3 RBR, 2 Yakaza)
      const facilitiesData = [
        // RBR Facilities
        {
          name: 'RBR Durban Central',
          address: '45 Smith Street, Durban Central, 4001',
          primaryColor: '#10b981',
          contactInfo: {
            phone: '+27 31 456 7890',
            email: 'durban@rbr.co.za'
          },
          defaultBusinessRules: {
            lateFeeAmount: 50,
            lateFeeStartDay: 5,
            childSurcharge: 10,
            gracePeriodDays: 3,
            paymentMethods: ['bank_transfer', 'eft', 'cash']
          },
          billingEntity: 'RBR Holdings Ltd',
          status: 'active'
        },
        {
          name: 'RBR Umhlanga',
          address: '12 Lighthouse Road, Umhlanga Rocks, 4320',
          primaryColor: '#059669',
          contactInfo: {
            phone: '+27 31 567 8901',
            email: 'umhlanga@rbr.co.za'
          },
          defaultBusinessRules: {
            lateFeeAmount: 50,
            lateFeeStartDay: 5,
            childSurcharge: 10,
            gracePeriodDays: 3,
            paymentMethods: ['bank_transfer', 'eft', 'cash']
          },
          billingEntity: 'RBR Holdings Ltd',
          status: 'active'
        },
        {
          name: 'RBR Pinetown',
          address: '78 Kingsway, Pinetown, 3610',
          primaryColor: '#047857',
          contactInfo: {
            phone: '+27 31 678 9012',
            email: 'pinetown@rbr.co.za'
          },
          defaultBusinessRules: {
            lateFeeAmount: 50,
            lateFeeStartDay: 5,
            childSurcharge: 10,
            gracePeriodDays: 3,
            paymentMethods: ['bank_transfer', 'eft', 'cash']
          },
          billingEntity: 'RBR Holdings Ltd',
          status: 'active'
        },
        // Yakaza Facilities
        {
          name: 'Yakaza Westville',
          address: '23 Jan Hofmeyr Road, Westville, 3629',
          primaryColor: '#6366f1',
          contactInfo: {
            phone: '+27 31 789 0123',
            email: 'westville@yakaza.co.za'
          },
          defaultBusinessRules: {
            lateFeeAmount: 50,
            lateFeeStartDay: 5,
            childSurcharge: 10,
            gracePeriodDays: 3,
            paymentMethods: ['bank_transfer', 'eft', 'cash']
          },
          billingEntity: 'Yakaza Properties (Pty) Ltd',
          status: 'active'
        },
        {
          name: 'Yakaza Amanzimtoti',
          address: '56 Beach Road, Amanzimtoti, 4125',
          primaryColor: '#4f46e5',
          contactInfo: {
            phone: '+27 31 890 1234',
            email: 'amanzimtoti@yakaza.co.za'
          },
          defaultBusinessRules: {
            lateFeeAmount: 50,
            lateFeeStartDay: 5,
            childSurcharge: 10,
            gracePeriodDays: 3,
            paymentMethods: ['bank_transfer', 'eft', 'cash']
          },
          billingEntity: 'Yakaza Properties (Pty) Ltd',
          status: 'active'
        }
      ];

      const createdFacilities = [];
      for (const facilityData of facilitiesData) {
        const facilityId = await facilityService.createFacility(facilityData);
        createdFacilities.push({ id: facilityId, ...facilityData });
        console.log(`Created facility: ${facilityData.name}`);
      }

      // Create rooms for each facility (10-20 rooms per facility)
      const createdRooms = [];
      let roomIndex = 0;
      
      for (const facility of createdFacilities) {
        // Generate random number of rooms between 10-20
        const numRooms = Math.floor(Math.random() * 11) + 10; // 10-20 rooms
        
        for (let i = 1; i <= numRooms; i++) {
          // Generate room types with realistic distribution
          const roomTypes = ['single', 'single', 'single', 'double', 'double', 'family']; // More singles
          const roomType = roomTypes[Math.floor(Math.random() * roomTypes.length)] as 'single' | 'double' | 'family' | 'studio';
          
          // Generate rent between R750-R1800
          const monthlyRent = Math.floor(Math.random() * 1051) + 750; // 750-1800
          
          // Determine room status: 40-95% occupied, 2% maintenance, rest available
          const rand = Math.random();
          let status: 'available' | 'occupied' | 'maintenance';
          if (rand < 0.02) {
            status = 'maintenance';
          } else if (rand < 0.85) { // 83% occupied (40-95% range, average ~85%)
            status = 'occupied';
          } else {
            status = 'available';
          }
          
          // Generate room number based on facility
          const facilityPrefix = facility.name.includes('RBR') ? 'R' : 'Y';
          const roomNumber = `${facilityPrefix}${String(i).padStart(3, '0')}`;
          
          const room = {
            facilityId: facility.id,
            roomNumber: roomNumber,
            type: roomType,
            capacity: roomType === 'family' ? 4 : roomType === 'double' ? 2 : 1,
            monthlyRent: monthlyRent,
            depositAmount: monthlyRent * 2, // 2 months deposit
            amenities: ['wifi', 'electricity', 'water', 'parking'],
            businessRules: {
              usesFacilityDefaults: true,
              lateFeeAmount: facility.defaultBusinessRules.lateFeeAmount,
              lateFeeStartDay: facility.defaultBusinessRules.lateFeeStartDay,
              childSurcharge: facility.defaultBusinessRules.childSurcharge,
              gracePeriodDays: facility.defaultBusinessRules.gracePeriodDays,
              paymentMethods: facility.defaultBusinessRules.paymentMethods
            },
            status: status,
            description: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} room with modern amenities in ${facility.name}`,
            floorLevel: Math.floor((i - 1) / 5) + 1, // 5 rooms per floor
            squareMeters: roomType === 'family' ? 45 : roomType === 'double' ? 30 : 20
          };

          const roomId = await roomService.createRoom(room);
          createdRooms.push({ id: roomId, ...room });
          roomIndex++;
          console.log(`Created room: ${room.roomNumber}`);
        }
      }

      // Create renters for occupied rooms with realistic South African names
      const southAfricanNames = [
        { firstName: 'Thabo', lastName: 'Mthembu', idNumber: '8501234567081', email: 'thabo.mthembu@gmail.com', phone: '+27 83 123 4567' },
        { firstName: 'Nomsa', lastName: 'Dlamini', idNumber: '9203456789082', email: 'nomsa.dlamini@gmail.com', phone: '+27 84 234 5678' },
        { firstName: 'Sipho', lastName: 'Nkosi', idNumber: '7805678901083', email: 'sipho.nkosi@gmail.com', phone: '+27 85 345 6789' },
        { firstName: 'Lerato', lastName: 'Molefe', idNumber: '8807890123084', email: 'lerato.molefe@gmail.com', phone: '+27 86 456 7890' },
        { firstName: 'Mandla', lastName: 'Zulu', idNumber: '9109012345085', email: 'mandla.zulu@gmail.com', phone: '+27 87 567 8901' },
        { firstName: 'Zanele', lastName: 'Mthembu', idNumber: '8512345678086', email: 'zanele.mthembu@gmail.com', phone: '+27 82 678 9012' },
        { firstName: 'Bongani', lastName: 'Ngcobo', idNumber: '7734567890087', email: 'bongani.ngcobo@gmail.com', phone: '+27 83 789 0123' },
        { firstName: 'Ntombi', lastName: 'Mkhize', idNumber: '9256789012088', email: 'ntombi.mkhize@gmail.com', phone: '+27 84 890 1234' },
        { firstName: 'Sibusiso', lastName: 'Mthembu', idNumber: '8501234567089', email: 'sibusiso.mthembu@gmail.com', phone: '+27 83 123 4568' },
        { firstName: 'Nomvula', lastName: 'Dlamini', idNumber: '9203456789090', email: 'nomvula.dlamini@gmail.com', phone: '+27 84 234 5679' },
        { firstName: 'Mthunzi', lastName: 'Nkosi', idNumber: '7805678901091', email: 'mthunzi.nkosi@gmail.com', phone: '+27 85 345 6790' },
        { firstName: 'Thandeka', lastName: 'Molefe', idNumber: '8807890123092', email: 'thandeka.molefe@gmail.com', phone: '+27 86 456 7891' },
        { firstName: 'Sizwe', lastName: 'Zulu', idNumber: '9109012345093', email: 'sizwe.zulu@gmail.com', phone: '+27 87 567 8902' },
        { firstName: 'Nokuthula', lastName: 'Mthembu', idNumber: '8512345678094', email: 'nokuthula.mthembu@gmail.com', phone: '+27 82 678 9013' },
        { firstName: 'Mfundo', lastName: 'Ngcobo', idNumber: '7734567890095', email: 'mfundo.ngcobo@gmail.com', phone: '+27 83 789 0124' },
        { firstName: 'Nomsa', lastName: 'Mkhize', idNumber: '9256789012096', email: 'nomsa.mkhize@gmail.com', phone: '+27 84 890 1235' },
        { firstName: 'Thulani', lastName: 'Mthembu', idNumber: '8501234567097', email: 'thulani.mthembu@gmail.com', phone: '+27 83 123 4569' },
        { firstName: 'Nokwanda', lastName: 'Dlamini', idNumber: '9203456789098', email: 'nokwanda.dlamini@gmail.com', phone: '+27 84 234 5680' },
        { firstName: 'Mxolisi', lastName: 'Nkosi', idNumber: '7805678901099', email: 'mxolisi.nkosi@gmail.com', phone: '+27 85 345 6791' },
        { firstName: 'Nomsa', lastName: 'Molefe', idNumber: '8807890123100', email: 'nomsa.molefe@gmail.com', phone: '+27 86 456 7892' },
        { firstName: 'Sipho', lastName: 'Zulu', idNumber: '9109012345101', email: 'sipho.zulu@gmail.com', phone: '+27 87 567 8903' },
        { firstName: 'Lerato', lastName: 'Mthembu', idNumber: '8512345678102', email: 'lerato.mthembu@gmail.com', phone: '+27 82 678 9014' },
        { firstName: 'Mandla', lastName: 'Ngcobo', idNumber: '7734567890103', email: 'mandla.ngcobo@gmail.com', phone: '+27 83 789 0125' },
        { firstName: 'Zanele', lastName: 'Mkhize', idNumber: '9256789012104', email: 'zanele.mkhize@gmail.com', phone: '+27 84 890 1236' },
        { firstName: 'Bongani', lastName: 'Mthembu', idNumber: '8501234567105', email: 'bongani.mthembu@gmail.com', phone: '+27 83 123 4570' },
        { firstName: 'Ntombi', lastName: 'Dlamini', idNumber: '9203456789106', email: 'ntombi.dlamini@gmail.com', phone: '+27 84 234 5681' },
        { firstName: 'Sibusiso', lastName: 'Nkosi', idNumber: '7805678901107', email: 'sibusiso.nkosi@gmail.com', phone: '+27 85 345 6792' },
        { firstName: 'Nomvula', lastName: 'Molefe', idNumber: '8807890123108', email: 'nomvula.molefe@gmail.com', phone: '+27 86 456 7893' },
        { firstName: 'Mthunzi', lastName: 'Zulu', idNumber: '9109012345109', email: 'mthunzi.zulu@gmail.com', phone: '+27 87 567 8904' },
        { firstName: 'Thandeka', lastName: 'Mthembu', idNumber: '8512345678110', email: 'thandeka.mthembu@gmail.com', phone: '+27 82 678 9015' }
      ];

      const createdRenters = [];
      const occupiedRooms = createdRooms.filter(room => room.status === 'occupied');
      
      for (let i = 0; i < occupiedRooms.length; i++) {
        const renterData = southAfricanNames[i % southAfricanNames.length];
        const renter = {
          personalInfo: {
            firstName: renterData.firstName,
            lastName: renterData.lastName,
            idNumber: renterData.idNumber,
            dateOfBirth: Timestamp.fromDate(new Date(1990 + (i % 10), i % 12, 15)),
            phone: renterData.phone,
            email: renterData.email,
            emergencyContact: {
              name: `${renterData.firstName} Emergency Contact`,
              phone: '+27 11 000 000' + i,
              relationship: 'Family'
            }
          },
          address: {
            street: `${i + 1} Main Road`,
            city: 'Durban',
            province: 'KwaZulu-Natal',
            postalCode: '4000'
          },
          employment: {
            employer: ['Shoprite', 'Pick n Pay', 'Woolworths', 'Spar', 'Checkers', 'Sasol', 'Anglo American', 'MTN', 'Vodacom', 'Standard Bank'][i % 10],
            position: ['Cashier', 'Sales Assistant', 'Manager', 'Driver', 'Security Guard', 'Cleaner', 'Receptionist', 'Technician', 'Supervisor', 'Assistant Manager'][i % 10],
            workPhone: '+27 31 111 111' + i,
            monthlyIncome: Math.floor(Math.random() * 15000) + 8000 // R8000-R23000
          },
          bankDetails: {
            accountHolder: `${renterData.firstName} ${renterData.lastName}`,
            bankName: 'Standard Bank',
            accountNumber: '12345678' + i,
            branchCode: '051001'
          },
          documents: {
            idCopy: 'provided',
            proofOfIncome: 'provided',
            bankStatement: 'provided'
          },
          status: 'active' as const
        };

        const renterId = await renterService.createRenter(renter);
        createdRenters.push({ id: renterId, ...renter });
        console.log(`Created renter: ${renterData.firstName} ${renterData.lastName}`);
      }

      // Create lease agreements for occupied rooms
      for (let i = 0; i < occupiedRooms.length; i++) {
        const room = occupiedRooms[i];
        const renter = createdRenters[i];
        const facility = createdFacilities.find(f => f.id === room.facilityId)!;

        // Generate random start date within 2025 (Jan-Dec)
        const startMonth = Math.floor(Math.random() * 12); // 0-11 (Jan-Dec)
        const startDate = new Date(2025, startMonth, Math.floor(Math.random() * 28) + 1); // Random day in month
        const endDate = new Date(2025, 11, 31); // December 31, 2025
        
        const lease = {
          facilityId: room.facilityId,
          roomId: room.id,
          renterId: renter.id,
          terms: {
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            monthlyRent: room.monthlyRent,
            depositAmount: room.depositAmount,
            depositPaid: true,
            depositPaidDate: Timestamp.fromDate(new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)) // Paid 1 week before start
          },
          businessRules: {
            lateFeeAmount: facility.defaultBusinessRules.lateFeeAmount,
            lateFeeStartDay: facility.defaultBusinessRules.lateFeeStartDay,
            childSurcharge: facility.defaultBusinessRules.childSurcharge,
            gracePeriodDays: facility.defaultBusinessRules.gracePeriodDays,
            paymentMethods: facility.defaultBusinessRules.paymentMethods
          },
          additionalTerms: 'Standard lease agreement terms and conditions apply.',
          status: 'active' as const
        };

        const leaseId = await leaseService.createLease(lease);
        console.log(`Created lease for room: ${room.roomNumber}`);

        // Create payment schedule for the lease
        const paymentSchedule = {
          leaseId: leaseId,
          facilityId: room.facilityId,
          roomId: room.id,
          renterId: renter.id,
          paymentDueDateSetting: 'first_day' as const,
          payments: [] as any[],
          totalAmount: 0,
          totalPaid: 0,
          outstandingAmount: 0
        };

        // Generate monthly payments for 2025
        let totalAmount = 0;
        let totalPaid = 0;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth(); // 0-11
        const currentYear = currentDate.getFullYear();
        
        // Determine if this room should have some overdue payments (10-15 rooms total)
        const shouldHaveOverdue = Math.random() < 0.15; // 15% chance of having overdue payments
        
        for (let month = 0; month < 12; month++) {
          const dueDate = new Date(2025, month, 1);
          const paymentAmount = room.monthlyRent;
          
          // Determine payment status
          let status: 'paid' | 'pending' | 'overdue' = 'pending';
          let paidAmount = 0;
          let paidDate: any = null;
          let paymentMethod: string | undefined = undefined;
          
          if (month < currentMonth && currentYear === 2025) {
            // Past months should be paid (unless this room has overdue payments)
            if (!shouldHaveOverdue || Math.random() < 0.8) {
              status = 'paid';
              paidAmount = paymentAmount;
              paidDate = Timestamp.fromDate(new Date(2025, month, Math.floor(Math.random() * 5) + 1));
              paymentMethod = ['bank_transfer', 'eft', 'cash'][Math.floor(Math.random() * 3)];
            } else {
              status = 'overdue';
            }
          } else if (month === currentMonth && currentYear === 2025) {
            // Current month - mostly paid, some pending
            if (Math.random() < 0.7) {
              status = 'paid';
              paidAmount = paymentAmount;
              paidDate = Timestamp.fromDate(new Date(2025, month, Math.floor(Math.random() * 5) + 1));
              paymentMethod = ['bank_transfer', 'eft', 'cash'][Math.floor(Math.random() * 3)];
            } else {
              status = 'pending';
            }
          } else {
            // Future months are pending
            status = 'pending';
          }
          
          const payment = {
            month: `2025-${String(month + 1).padStart(2, '0')}`,
            dueDate: Timestamp.fromDate(dueDate),
            amount: paymentAmount,
            type: 'rent' as const,
            status: status,
            ...(status === 'paid' && {
              paidAmount: paidAmount,
              paidDate: paidDate,
              paymentMethod: paymentMethod
            })
          };

          paymentSchedule.payments.push(payment);
          totalAmount += paymentAmount;
          if (status === 'paid') totalPaid += paidAmount;
        }

        paymentSchedule.totalAmount = totalAmount;
        paymentSchedule.totalPaid = totalPaid;
        paymentSchedule.outstandingAmount = totalAmount - totalPaid;

        await paymentScheduleService.createPaymentSchedule(paymentSchedule);
        console.log(`Created payment schedule for room: ${room.roomNumber}`);
      }

      setSeedComplete(true);
      console.log('Test data creation completed!');
      
    } catch (error) {
      console.error('Error seeding data:', error);
      alert('Failed to create test data. Please check the console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Database className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">Data Management</h2>
        </div>
        <Button variant="ghost" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-4">
        <p className="text-gray-400">
          Manage system data for testing and development purposes. Use with caution in production environments.
        </p>

        {/* Clear Data Section */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Clear All Data</h3>
              <p className="text-gray-300 mb-4">
                Permanently delete all facilities, rooms, renters, leases, payments, and related data. 
                This action cannot be undone.
              </p>
              <Button
                variant="secondary"
                onClick={handleClearData}
                disabled={isClearing}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Clearing Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </>
                )}
              </Button>
              {clearComplete && (
                <div className="flex items-center mt-2 text-green-400">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Data cleared successfully!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seed Data Section */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <RefreshCw className="w-6 h-6 text-green-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">Create Test Data</h3>
              <p className="text-gray-300 mb-4">
                Generate sample data for testing and demonstration:
              </p>
              <ul className="text-gray-300 mb-4 space-y-1 text-sm">
                <li>• 5 Facilities: 3 RBR, 2 Yakaza (all in KZN)</li>
                <li>• 10-20 Rooms per facility with pricing R750-R1800</li>
                <li>• 40-95% occupancy with realistic South African renters</li>
                <li>• 2% rooms in maintenance status</li>
                <li>• Lease agreements for 2025 (Jan-Dec)</li>
                <li>• Most payments up to date, some overdue (10-15 rooms)</li>
              </ul>
              <Button
                variant="primary"
                onClick={handleSeedData}
                disabled={isSeeding}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating Test Data...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Create Test Data
                  </>
                )}
              </Button>
              {seedComplete && (
                <div className="flex items-center mt-2 text-green-400">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Test data created successfully!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calculate Penalties Section */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Calculator className="w-6 h-6 text-yellow-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Calculate Penalties</h3>
              <p className="text-gray-300 mb-4">
                Calculate aggregated penalties for all overdue payments. This will create penalty records 
                for any payments that are past their due date.
              </p>
              <Button
                variant="secondary"
                onClick={handleCalculatePenalties}
                disabled={isSeeding}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Calculating Penalties...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Penalties
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Clear User Data Section */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-orange-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-400 mb-2">Clear User Data (Preserve Admin)</h3>
              <p className="text-gray-300 mb-4">
                Delete all user accounts except the admin user. This is useful for testing user creation flows.
              </p>
              <Button
                variant="secondary"
                onClick={handleClearUserData}
                disabled={isClearing}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Clearing User Data...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear User Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h4 className="text-blue-400 font-medium mb-2">Instructions:</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>1. Use "Clear All Data" first if you want to start fresh</li>
            <li>2. Click "Create Test Data" to populate the system</li>
            <li>3. Test the application with realistic data scenarios</li>
            <li>4. Close this modal when done</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
