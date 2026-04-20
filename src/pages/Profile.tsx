import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Phone, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import {
  updatePassword,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Profile: React.FC = () => {
  const { user } = useAuth();

  // ── Contact info state ─────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [contactError, setContactError] = useState('');

  // ── Password change state ──────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Load existing phone from Firestore user doc
  useEffect(() => {
    if (!user?.uid) return;
    import('firebase/firestore').then(({ getDoc }) => {
      getDoc(doc(db, 'users', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.phone) setPhone(data.phone);
          if (data.displayName) setDisplayName(data.displayName);
        }
      }).catch(() => {});
    });
  }, [user]);

  const handleSaveContact = async () => {
    if (!user?.uid) return;
    setContactSaving(true);
    setContactError('');
    setContactSaved(false);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        phone,
        updatedAt: new Date(),
      });
      setContactSaved(true);
      setTimeout(() => setContactSaved(false), 3000);
    } catch (err: any) {
      setContactError(err.message || 'Failed to save changes.');
    } finally {
      setContactSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSaved(false);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (!user?.email) {
      setPasswordError('No email address associated with this account.');
      return;
    }

    setPasswordSaving(true);
    try {
      // Re-authenticate before changing password (Firebase requirement)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Current password is incorrect.');
      } else {
        setPasswordError(err.message || 'Failed to change password.');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-7 h-7 text-yellow-400" />
          My Profile
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Update your contact info and change your password</p>
      </div>

      {/* Account info (read-only) */}
      <Card>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          Account
        </h2>
        <div className="space-y-1">
          <p className="text-sm text-gray-400">Email address</p>
          <p className="text-white font-medium">{user?.email}</p>
        </div>
      </Card>

      {/* Contact info */}
      <Card>
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          Contact Information
        </h2>
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+27 000 000 0000"
                className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          {contactError && (
            <p className="text-red-400 text-sm">{contactError}</p>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleSaveContact}
              disabled={contactSaving}
            >
              {contactSaving ? (
                'Saving…'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            {contactSaved && (
              <span className="flex items-center gap-1 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Saved
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Password change */}
      <Card>
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          Change Password
        </h2>
        <div className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full pr-10 pl-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pr-10 pl-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
          />

          {passwordError && (
            <p className="text-red-400 text-sm">{passwordError}</p>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={handleChangePassword}
              disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            >
              {passwordSaving ? (
                'Updating…'
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
            {passwordSaved && (
              <span className="flex items-center gap-1 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Password updated
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
