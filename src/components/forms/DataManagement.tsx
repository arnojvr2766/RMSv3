import React, { useState } from 'react';
import { Database, Trash2, RefreshCw, X, AlertTriangle, CheckCircle, Calculator } from 'lucide-react';
import Button from '../ui/Button';
import { 
  facilityService, 
  roomService, 
  renterService, 
  leaseService, 
  paymentScheduleService,
  depositPayoutService,
  maintenanceExpenseService
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
  const [seedProgress, setSeedProgress] = useState(0);

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

  const handleCalculatePenalties = async () => {
    try {
      setIsSeeding(true);
      setSeedProgress(0);
      
      console.log('Starting penalty calculation...');
      setSeedProgress(20);
      
      // Calculate daily penalties for all active leases
      await aggregatedPenaltyService.calculateDailyPenalties();
      
      setSeedProgress(100);
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

      // Create facilities
      const facilitiesData = [
        {
          name: 'Yakaza',
          address: '12 Yakaza Road, Johannesburg, 2001',
          primaryColor: '#6366f1',
          contactInfo: {
            phone: '+27 11 123 4567',
            email: 'info@yakaza.com',
            website: 'www.yakaza.com'
          },
          defaultBusinessRules: {
            lateFeeAmount: 250,
            lateFeeStartDay: 5,
            childSurcharge: 200,
            gracePeriodDays: 3,
            paymentMethods: ['bank_transfer', 'eft', 'cash']
          },
          billingEntity: 'Yakaza Properties (Pty) Ltd'
        },
        {
          name: 'RBM',
          address: '45 RBM Street, Cape Town, 8001',
          primaryColor: '#10b981',
          contactInfo: {
            phone: '+27 21 456 7890',
            email: 'rentals@rbm.co.za',
            website: 'www.rbm.co.za'
          },
          defaultBusinessRules: {
            lateFeeAmount: 300,
            lateFeeStartDay: 7,
            childSurcharge: 150,
            gracePeriodDays: 5,
            paymentMethods: ['bank_transfer', 'eft', 'debit_card']
          },
          billingEntity: 'RBM Holdings Ltd'
        },
        {
          name: 'Test Facility',
          address: '123 Test Avenue, Durban, 4001',
          primaryColor: '#f59e0b',
          contactInfo: {
            phone: '+27 31 789 0123',
            email: 'admin@testfacility.com',
            website: 'www.testfacility.com'
          },
          defaultBusinessRules: {
            lateFeeAmount: 200,
            lateFeeStartDay: 3,
            childSurcharge: 100,
            gracePeriodDays: 2,
            paymentMethods: ['bank_transfer', 'cash']
          },
          billingEntity: 'Test Facility Management'
        }
      ];

      const createdFacilities = [];
      for (const facilityData of facilitiesData) {
        const facilityId = await facilityService.createFacility(facilityData);
        createdFacilities.push({ id: facilityId, ...facilityData });
        console.log(`Created facility: ${facilityData.name}`);
      }

      // Create rooms for each facility
      const roomsData = [
        // Yakaza rooms
        { roomNumber: 'Y001', monthlyRent: 1200, type: 'single' },
        { roomNumber: 'Y002', monthlyRent: 1500, type: 'double' },
        { roomNumber: 'Y003', monthlyRent: 800, type: 'single' },
        // RBM rooms
        { roomNumber: 'R101', monthlyRent: 1700, type: 'family' },
        { roomNumber: 'R102', monthlyRent: 900, type: 'single' },
        { roomNumber: 'R103', monthlyRent: 1300, type: 'double' },
        // Test Facility rooms
        { roomNumber: 'T201', monthlyRent: 500, type: 'studio' },
        { roomNumber: 'T202', monthlyRent: 1100, type: 'single' },
        { roomNumber: 'T203', monthlyRent: 1400, type: 'double' }
      ];

      const createdRooms = [];
      let roomIndex = 0;
      
      for (const facility of createdFacilities) {
        for (let i = 0; i < 3; i++) {
          const roomData = roomsData[roomIndex];
          const room = {
            facilityId: facility.id,
            roomNumber: roomData.roomNumber,
            type: roomData.type as 'single' | 'double' | 'family' | 'studio',
            capacity: roomData.type === 'family' ? 4 : roomData.type === 'double' ? 2 : 1,
            monthlyRent: roomData.monthlyRent,
            depositAmount: roomData.monthlyRent * 2, // 2 months deposit
            amenities: ['wifi', 'electricity', 'water'],
            businessRules: {
              usesFacilityDefaults: true,
              lateFeeAmount: facility.defaultBusinessRules.lateFeeAmount,
              lateFeeStartDay: facility.defaultBusinessRules.lateFeeStartDay,
              childSurcharge: facility.defaultBusinessRules.childSurcharge,
              gracePeriodDays: facility.defaultBusinessRules.gracePeriodDays,
              paymentMethods: facility.defaultBusinessRules.paymentMethods
            },
            status: i === 2 ? 'available' as const : 'occupied' as const, // Leave last room of each facility available
            description: `${roomData.type.charAt(0).toUpperCase() + roomData.type.slice(1)} room with modern amenities`,
            floorLevel: Math.floor(i / 2) + 1,
            squareMeters: roomData.type === 'family' ? 45 : roomData.type === 'double' ? 30 : 20
          };

          const roomId = await roomService.createRoom(room);
          createdRooms.push({ id: roomId, ...room });
          roomIndex++;
          console.log(`Created room: ${room.roomNumber}`);
        }
      }

      // Create renters for occupied rooms (8 renters total)
      const rentersData = [
        { firstName: 'John', lastName: 'Smith', idNumber: '8501234567081', email: 'john.smith@email.com', phone: '+27 83 123 4567' },
        { firstName: 'Sarah', lastName: 'Johnson', idNumber: '9203456789082', email: 'sarah.j@email.com', phone: '+27 84 234 5678' },
        { firstName: 'Michael', lastName: 'Brown', idNumber: '7805678901083', email: 'mike.brown@email.com', phone: '+27 85 345 6789' },
        { firstName: 'Lisa', lastName: 'Davis', idNumber: '8807890123084', email: 'lisa.davis@email.com', phone: '+27 86 456 7890' },
        { firstName: 'David', lastName: 'Wilson', idNumber: '9109012345085', email: 'david.w@email.com', phone: '+27 87 567 8901' },
        { firstName: 'Emma', lastName: 'Taylor', idNumber: '8512345678086', email: 'emma.taylor@email.com', phone: '+27 82 678 9012' },
        { firstName: 'James', lastName: 'Anderson', idNumber: '7734567890087', email: 'james.a@email.com', phone: '+27 83 789 0123' },
        { firstName: 'Sophie', lastName: 'Martinez', idNumber: '9256789012088', email: 'sophie.m@email.com', phone: '+27 84 890 1234' }
      ];

      const createdRenters = [];
      for (let i = 0; i < rentersData.length; i++) {
        const renterData = rentersData[i];
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
              phone: '+27 11 000 000' + i
            }
          },
          addressInfo: {
            street: `${i + 1} Test Street`,
            city: 'Johannesburg',
            province: 'Gauteng',
            postalCode: '2000'
          },
          employmentInfo: {
            employer: `Company ${i + 1}`,
            position: 'Employee',
            workPhone: '+27 11 111 111' + i,
            monthlyIncome: 15000 + (i * 2000)
          },
          bankingInfo: {
            bankName: 'Standard Bank',
            accountNumber: '12345678' + i,
            branchCode: '051001'
          },
          documentsInfo: {
            idCopyProvided: true,
            proofOfIncomeProvided: true,
            bankStatementsProvided: true,
            referencesProvided: true
          },
          status: 'active' as const
        };

        const renterId = await renterService.createRenter(renter);
        createdRenters.push({ id: renterId, ...renter });
        console.log(`Created renter: ${renterData.firstName} ${renterData.lastName}`);
      }

      // Create lease agreements for occupied rooms (2 per facility = 6 total)
      const occupiedRooms = createdRooms.filter(room => room.status === 'occupied');
      
      for (let i = 0; i < occupiedRooms.length; i++) {
        const room = occupiedRooms[i];
        const renter = createdRenters[i];
        const facility = createdFacilities.find(f => f.id === room.facilityId)!;

        const lease = {
          facilityId: room.facilityId,
          roomId: room.id,
          renterId: renter.id,
          terms: {
            startDate: Timestamp.fromDate(new Date(2025, 0, 1)), // January 1, 2025
            endDate: Timestamp.fromDate(new Date(2025, 11, 31)), // December 31, 2025
            monthlyRent: room.monthlyRent,
            depositAmount: room.depositAmount,
            depositPaid: true,
            depositPaidDate: Timestamp.fromDate(new Date(2024, 11, 15)) // Paid in December 2024
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
          payments: [] as any[],
          totalAmount: 0,
          totalPaid: 0,
          outstandingAmount: 0
        };

        // Generate monthly payments for 2025
        let totalAmount = 0;
        let totalPaid = 0;
        
        for (let month = 0; month < 12; month++) {
          const dueDate = new Date(2025, month, 1);
          const isPaid = month < 3; // First 3 months are paid
          const paymentAmount = room.monthlyRent;
          
          const payment = {
            month: `2025-${String(month + 1).padStart(2, '0')}`,
            dueDate: Timestamp.fromDate(dueDate),
            amount: paymentAmount,
            type: 'rent' as const,
            status: isPaid ? 'paid' as const : 'pending' as const,
            ...(isPaid && {
              paidAmount: paymentAmount,
              paidDate: Timestamp.fromDate(new Date(2025, month, Math.floor(Math.random() * 5) + 1)),
              paymentMethod: ['bank_transfer', 'eft', 'cash'][Math.floor(Math.random() * 3)]
            })
          };

          paymentSchedule.payments.push(payment);
          totalAmount += paymentAmount;
          if (isPaid) totalPaid += paymentAmount;
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
                <li>• 3 Facilities: Yakaza, RBM, Test Facility</li>
                <li>• 9 Rooms total (3 per facility) with pricing R500-R1700</li>
                <li>• 8 Renters with complete profiles</li>
                <li>• 8 Lease agreements (1 room per facility left available)</li>
                <li>• Payment schedules for all of 2025</li>
                <li>• Some payments already captured (first 3 months)</li>
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
