/**
 * Script to set up test data for comprehensive testing
 * Run with: node scripts/setup-test-data.js
 * 
 * Note: This requires Firebase Admin SDK and emulator to be running
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (connect to emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'demo-test',
  });
}

const db = admin.firestore();

// Test data configuration
const testData = {
  facilities: [
    {
      id: 'test-facility-1',
      name: 'Test Facility Alpha',
      address: '123 Test Street',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8000',
      contactEmail: 'facility@test.com',
      contactPhone: '+27123456789',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],
  rooms: [
    {
      id: 'test-room-locked',
      facilityId: 'test-facility-1',
      roomNumber: 'A2-11',
      type: 'single',
      capacity: 1,
      monthlyRent: 5000,
      depositAmount: 5000,
      amenities: ['WiFi', 'Parking'],
      businessRules: {
        lateFeeAmount: 20,
        lateFeeStartDay: 4,
        childSurcharge: 500,
        gracePeriodDays: 5,
        paymentMethods: ['cash', 'bank_transfer', 'eft'],
        usesFacilityDefaults: false,
      },
      status: 'locked',
      lastOccupancyState: 'locked',
      lastMonthStatus: 'empty',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {
      id: 'test-room-empty',
      facilityId: 'test-facility-1',
      roomNumber: 'B3-22',
      type: 'double',
      capacity: 2,
      monthlyRent: 7000,
      depositAmount: 7000,
      amenities: ['WiFi', 'Parking', 'Kitchen'],
      businessRules: {
        lateFeeAmount: 25,
        lateFeeStartDay: 4,
        childSurcharge: 500,
        gracePeriodDays: 5,
        paymentMethods: ['cash', 'bank_transfer', 'eft'],
        usesFacilityDefaults: false,
      },
      status: 'empty',
      lastOccupancyState: 'empty',
      lastMonthStatus: 'empty',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],
  users: [
    {
      id: 'test-renter-1',
      email: 'renter1@test.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+27111111111',
      idNumber: '8501015800088',
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  ],
};

async function setupTestData() {
  console.log('🚀 Setting up test data...\n');

  try {
    // Setup Facilities
    console.log('📋 Creating facilities...');
    for (const facility of testData.facilities) {
      await db.collection('facilities').doc(facility.id).set(facility);
      console.log(`  ✓ Created facility: ${facility.name}`);
    }

    // Setup Rooms
    console.log('\n🏠 Creating rooms...');
    for (const room of testData.rooms) {
      await db.collection('rooms').doc(room.id).set(room);
      console.log(`  ✓ Created room: ${room.roomNumber} (Status: ${room.status})`);
    }

    // Setup Users (Renters)
    console.log('\n👤 Creating renters...');
    for (const user of testData.users) {
      await db.collection('users').doc(user.id).set(user);
      console.log(`  ✓ Created renter: ${user.firstName} ${user.lastName}`);
    }

    // Create a lease for testing
    console.log('\n📝 Creating test lease...');
    const leaseStartDate = new Date();
    const leaseEndDate = new Date();
    leaseEndDate.setMonth(leaseEndDate.getMonth() + 6); // 6 month lease

    const lease = {
      facilityId: 'test-facility-1',
      roomId: 'test-room-locked',
      renterId: 'test-renter-1',
      childrenCount: 0,
      terms: {
        startDate: admin.firestore.Timestamp.fromDate(leaseStartDate),
        endDate: admin.firestore.Timestamp.fromDate(leaseEndDate),
        monthlyRent: 5000,
        depositAmount: 5000,
        depositPaid: false,
      },
      businessRules: {
        lateFeeAmount: 20,
        lateFeeStartDay: 4,
        childSurcharge: 500,
        gracePeriodDays: 5,
        paymentMethods: ['cash', 'bank_transfer', 'eft'],
      },
      status: 'active',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('leaseAgreements').doc('test-lease-1').set(lease);
    console.log('  ✓ Created test lease');

    // Create organization settings for testing
    console.log('\n⚙️  Creating organization settings...');
    const orgSettings = {
      allowPartialPayments: false,
      paymentDueDate: 'last_day',
      allowStandardUserPastPayments: false,
      requireAdminApprovalForPastPayments: true,
      maxPastPaymentDays: 30,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    await db.collection('organizationSettings').doc('default').set(orgSettings);
    console.log('  ✓ Created organization settings');

    console.log('\n✅ Test data setup complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Facilities: ${testData.facilities.length}`);
    console.log(`   - Rooms: ${testData.rooms.length}`);
    console.log(`   - Renters: ${testData.users.length}`);
    console.log(`   - Leases: 1`);
    console.log('\n💡 You can now run your tests!');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    process.exit(1);
  }
}

// Run the setup
setupTestData()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

