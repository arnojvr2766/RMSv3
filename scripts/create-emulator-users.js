#!/usr/bin/env node

/**
 * Script to create test users in Firebase Auth Emulator
 * Also creates corresponding user documents in Firestore
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with emulator configuration
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
  projectId: 'rmsv3-becf7',
});

const auth = admin.auth();
const db = getFirestore();

async function createUser(email, password, firstName, lastName, role) {
  try {
    // Create auth user
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: `${firstName} ${lastName}`,
    });

    console.log(`✅ Created auth user: ${email} (UID: ${userRecord.uid})`);

    // Create Firestore user document
    const userData = {
      id: userRecord.uid,
      email,
      firstName,
      lastName,
      role,
      status: 'active',
      emailVerified: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      loginCount: 0,
    };

    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log(`✅ Created Firestore user document: ${email} with role: ${role}`);

    return userRecord;
  } catch (error) {
    console.error(`❌ Error creating user ${email}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting user creation in Firebase Emulator...\n');

  try {
    // Create system_admin user
    await createUser(
      'admin@rms.local',
      'admin123',
      'System',
      'Administrator',
      'system_admin'
    );

    console.log('');

    // Create standard_user
    await createUser(
      'user@rms.local',
      'user123',
      'Standard',
      'User',
      'standard_user'
    );

    console.log('\n✨ All users created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   System Admin:');
    console.log('     Email: admin@rms.local');
    console.log('     Password: admin123');
    console.log('\n   Standard User:');
    console.log('     Email: user@rms.local');
    console.log('     Password: user123');
    console.log('\n💡 Make sure your Firebase emulators are running!');
  } catch (error) {
    console.error('❌ Failed to create users:', error);
    process.exit(1);
  }

  // Close connections
  await Promise.all([auth.app.delete(), db.terminate()]);
}

main();
