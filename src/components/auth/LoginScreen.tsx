import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { Building2, Shield, Users, DollarSign, Calendar, FileText, Settings, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      console.log('Login successful:', result.user);
      onLoginSuccess();
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email. Please contact your administrator.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact your administrator.';
          break;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const features = [
    {
      icon: Building2,
      title: 'Facility Management',
      description: 'Manage multiple rental facilities with ease'
    },
    {
      icon: Users,
      title: 'Renter Profiles',
      description: 'Complete renter information and documentation'
    },
    {
      icon: DollarSign,
      title: 'Payment Tracking',
      description: 'Track rent payments and overdue accounts'
    },
    {
      icon: Calendar,
      title: 'Lease Management',
      description: 'Manage lease agreements and renewals'
    },
    {
      icon: FileText,
      title: 'Reports & Analytics',
      description: 'Generate comprehensive property reports'
    },
    {
      icon: Settings,
      title: 'Business Rules',
      description: 'Configure late fees and payment policies'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFD300' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}></div>
      </div>
      
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding & Features */}
          <div className="text-center lg:text-left space-y-8">
            {/* Logo & Brand */}
            <div className="space-y-6">
              <div className="flex items-center justify-center lg:justify-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                  <img 
                    src="/RentDesk.png" 
                    alt="RentDesk Logo" 
                    className="w-12 h-12 rounded-lg"
                  />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white">RentDesk</h1>
                  <p className="text-gray-400 text-xs">Version 3.0</p>
                </div>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                Streamline Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-500">
                  Property Management
                </span>
              </h2>
              
              <p className="text-xl text-gray-300 max-w-lg mx-auto lg:mx-0">
                Manage facilities, track payments, and handle lease agreements all in one powerful platform designed for South African property management.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 hover:border-yellow-500/30 transition-all duration-200">
                  <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">{feature.title}</h3>
                    <p className="text-gray-400 text-xs">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Login Card */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md bg-gray-800/80 backdrop-blur-lg border border-gray-700 p-8 shadow-2xl">
              <div className="space-y-6">
                {/* Welcome Text */}
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-white">
                    Welcome Back
                  </h3>
                  <p className="text-gray-300">
                    Sign in to access your rental management dashboard
                  </p>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleLogin} className="space-y-4" data-form-type="other">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      required
                      className="w-full"
                      autoComplete="email"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck="false"
                      data-form-type="other"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                      Password
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
                        autoComplete="current-password"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck="false"
                        data-form-type="other"
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


                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:shadow-yellow-500/30"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
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
                    <span>Secure authentication powered by Firebase</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
