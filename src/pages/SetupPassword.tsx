import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { userService } from '../services/userService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react';

const SetupPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid invitation link. Please contact your administrator.');
        setIsLoading(false);
        return;
      }

      try {
        // TODO: Implement token validation
        // For now, we'll simulate finding user by token
        // In production, you'd query Firestore for the user with this token
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock user data - in production, this would come from Firestore
        setUserInfo({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          role: 'standard_user'
        });
        
        setIsLoading(false);
      } catch (error: any) {
        setError('Invalid or expired invitation link. Please contact your administrator.');
        setIsLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUp(true);
    setError(null);

    try {
      // Validate passwords
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setIsSettingUp(false);
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        setIsSettingUp(false);
        return;
      }

      if (!userInfo) {
        setError('User information not found');
        setIsSettingUp(false);
        return;
      }

      // Create Firebase user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userInfo.email, 
        formData.password
      );

      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: `${userInfo.firstName} ${userInfo.lastName}`
      });

      // TODO: Update user status in Firestore to 'active'
      // await userService.updateUserStatus(userId, 'active');

      setSuccess(true);
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (error: any) {
      console.error('Error setting up password:', error);
      let errorMessage = 'Failed to set up password. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please contact your administrator.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
      }
      
      setError(errorMessage);
    } finally {
      setIsSettingUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/80 backdrop-blur-lg border border-gray-700 p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Invalid Invitation</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <Button
              onClick={() => navigate('/')}
              className="w-full"
            >
              Return to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/80 backdrop-blur-lg border border-gray-700 p-8 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Account Created!</h1>
            <p className="text-gray-300 mb-6">
              Your password has been set up successfully. You'll be redirected to the dashboard shortly.
            </p>
            <div className="w-full bg-gray-700 rounded-lg p-4">
              <div className="w-full bg-green-500 rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD300' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-gray-800/80 backdrop-blur-lg border border-gray-700 p-8 shadow-2xl">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                  <img 
                    src="/RentDesk.png" 
                    alt="RentDesk Logo" 
                    className="w-8 h-8 rounded-lg"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">RentDesk</h1>
                  <p className="text-yellow-400 text-sm">Set Up Your Account</p>
                </div>
              </div>
              
              <div className="p-4 bg-gray-700 rounded-lg">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Welcome, {userInfo?.firstName} {userInfo?.lastName}!
                </h2>
                <p className="text-gray-300 text-sm mb-2">
                  Email: {userInfo?.email}
                </p>
                <div className="inline-block bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                  {userInfo?.role === 'system_admin' ? 'System Administrator' : 'Standard User'}
                </div>
              </div>
            </div>

            {/* Password Setup Form */}
            <form onSubmit={handleSetupPassword} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Create Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    className="w-full pr-10"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    required
                    className="w-full pr-10"
                    autoComplete="new-password"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSettingUp}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:shadow-yellow-500/30"
              >
                {isSettingUp ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Setting up account...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            </form>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Security Note */}
            <div className="pt-4 border-t border-gray-600">
              <div className="flex items-center justify-center space-x-2 text-gray-400 text-sm">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span>Secure account setup powered by Firebase</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SetupPassword;
