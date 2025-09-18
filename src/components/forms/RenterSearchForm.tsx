import React, { useState, useEffect } from 'react';
import { Search, UserPlus, User, Phone, Mail, FileText, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { renterService } from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';

// Temporary inline type definitions
interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    idNumber: string;
    dateOfBirth: any;
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
  createdAt: any;
  updatedAt: any;
}

interface RenterSearchFormProps {
  onRenterSelected: (renter: Renter) => void;
  onCancel: () => void;
}

const RenterSearchForm: React.FC<RenterSearchFormProps> = ({ onRenterSelected, onCancel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Renter[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New renter form data
  const [newRenterData, setNewRenterData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    employer: '',
    position: '',
    monthlyIncome: 0,
    workPhone: '',
    accountHolder: '',
    bankName: '',
    accountNumber: '',
    branchCode: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Search renters when search term changes
  useEffect(() => {
    const searchRenters = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await renterService.searchRenters(searchTerm);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching renters:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchRenters, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleInputChange = (field: string, value: any) => {
    setNewRenterData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!newRenterData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!newRenterData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!newRenterData.idNumber.trim()) newErrors.idNumber = 'ID number is required';
    if (!newRenterData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!newRenterData.email.trim()) newErrors.email = 'Email is required';
    if (!newRenterData.monthlyIncome || newRenterData.monthlyIncome <= 0) {
      newErrors.monthlyIncome = 'Monthly income must be greater than 0';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newRenterData.email && !emailRegex.test(newRenterData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddNewRenter = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const renterData = {
        personalInfo: {
          firstName: newRenterData.firstName.trim(),
          lastName: newRenterData.lastName.trim(),
          idNumber: newRenterData.idNumber.trim(),
          dateOfBirth: Timestamp.fromDate(new Date(newRenterData.dateOfBirth)),
          phone: newRenterData.phone.trim(),
          email: newRenterData.email.trim(),
          emergencyContact: {
            name: newRenterData.emergencyContactName.trim(),
            phone: newRenterData.emergencyContactPhone.trim(),
            relationship: newRenterData.emergencyContactRelationship.trim(),
          },
        },
        address: {
          street: newRenterData.street.trim(),
          city: newRenterData.city.trim(),
          province: newRenterData.province.trim(),
          postalCode: newRenterData.postalCode.trim(),
        },
        employment: {
          employer: newRenterData.employer.trim(),
          position: newRenterData.position.trim(),
          monthlyIncome: newRenterData.monthlyIncome,
          workPhone: newRenterData.workPhone.trim(),
        },
        bankDetails: {
          accountHolder: newRenterData.accountHolder.trim(),
          bankName: newRenterData.bankName.trim(),
          accountNumber: newRenterData.accountNumber.trim(),
          branchCode: newRenterData.branchCode.trim(),
        },
        documents: {},
        status: 'active' as const,
        notes: newRenterData.notes.trim(),
      };

      const renterId = await renterService.createRenter(renterData);
      
      // Create the full renter object with the new ID
      const newRenter: Renter = {
        id: renterId,
        ...renterData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      onRenterSelected(newRenter);
    } catch (error) {
      console.error('Error creating renter:', error);
      alert('Failed to create renter. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showAddForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Add New Renter</h3>
          <Button variant="ghost" onClick={() => setShowAddForm(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card>
            <h4 className="text-md font-semibold text-white mb-4">Personal Information</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={newRenterData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  error={errors.firstName}
                  required
                />
                <Input
                  label="Last Name"
                  value={newRenterData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  error={errors.lastName}
                  required
                />
              </div>
              <Input
                label="ID Number"
                value={newRenterData.idNumber}
                onChange={(e) => handleInputChange('idNumber', e.target.value)}
                error={errors.idNumber}
                required
              />
              <Input
                label="Date of Birth"
                type="date"
                value={newRenterData.dateOfBirth}
                onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  value={newRenterData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  error={errors.phone}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={newRenterData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  required
                />
              </div>
            </div>
          </Card>

          {/* Employment Information */}
          <Card>
            <h4 className="text-md font-semibold text-white mb-4">Employment</h4>
            <div className="space-y-4">
              <Input
                label="Employer"
                value={newRenterData.employer}
                onChange={(e) => handleInputChange('employer', e.target.value)}
              />
              <Input
                label="Position"
                value={newRenterData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
              />
              <Input
                label="Monthly Income (R)"
                type="number"
                value={newRenterData.monthlyIncome}
                onChange={(e) => handleInputChange('monthlyIncome', parseFloat(e.target.value) || 0)}
                error={errors.monthlyIncome}
                required
                min="0"
              />
              <Input
                label="Work Phone"
                value={newRenterData.workPhone}
                onChange={(e) => handleInputChange('workPhone', e.target.value)}
              />
            </div>
          </Card>
        </div>

        {/* Emergency Contact & Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <h4 className="text-md font-semibold text-white mb-4">Emergency Contact</h4>
            <div className="space-y-4">
              <Input
                label="Contact Name"
                value={newRenterData.emergencyContactName}
                onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
              />
              <Input
                label="Contact Phone"
                value={newRenterData.emergencyContactPhone}
                onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
              />
              <Input
                label="Relationship"
                value={newRenterData.emergencyContactRelationship}
                onChange={(e) => handleInputChange('emergencyContactRelationship', e.target.value)}
                placeholder="e.g., Spouse, Parent, Sibling"
              />
            </div>
          </Card>

          <Card>
            <h4 className="text-md font-semibold text-white mb-4">Address</h4>
            <div className="space-y-4">
              <Input
                label="Street Address"
                value={newRenterData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={newRenterData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
                <Input
                  label="Province"
                  value={newRenterData.province}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                />
              </div>
              <Input
                label="Postal Code"
                value={newRenterData.postalCode}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
              />
            </div>
          </Card>
        </div>

        {/* Banking Details */}
        <Card>
          <h4 className="text-md font-semibold text-white mb-4">Banking Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Account Holder"
              value={newRenterData.accountHolder}
              onChange={(e) => handleInputChange('accountHolder', e.target.value)}
            />
            <Input
              label="Bank Name"
              value={newRenterData.bankName}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
            />
            <Input
              label="Account Number"
              value={newRenterData.accountNumber}
              onChange={(e) => handleInputChange('accountNumber', e.target.value)}
            />
            <Input
              label="Branch Code"
              value={newRenterData.branchCode}
              onChange={(e) => handleInputChange('branchCode', e.target.value)}
            />
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <h4 className="text-md font-semibold text-white mb-4">Additional Notes</h4>
          <textarea
            value={newRenterData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
            placeholder="Any additional notes about the renter..."
          />
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={() => setShowAddForm(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddNewRenter} disabled={isLoading}>
            <UserPlus className="w-4 h-4 mr-2" />
            {isLoading ? 'Creating...' : 'Create Renter'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Search or Add Renter</h3>
      </div>

      {/* Search Section */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, ID number, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Search Results - Click to select:</h4>
            {searchResults.map((renter) => (
              <Card 
                key={renter.id} 
                className="hover:bg-gray-700 hover:border-primary-500/50 transition-all cursor-pointer p-4 border border-gray-600 hover:shadow-lg" 
                onClick={() => {
                  console.log('Renter selected:', renter);
                  onRenterSelected(renter);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">
                        {renter.personalInfo.firstName} {renter.personalInfo.lastName}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {renter.personalInfo.phone}
                        </span>
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {renter.personalInfo.email}
                        </span>
                        <span className="flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          {renter.personalInfo.idNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      renter.status === 'active' 
                        ? 'bg-green-500/20 text-green-400'
                        : renter.status === 'inactive'
                        ? 'bg-gray-500/20 text-gray-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {renter.status}
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Renter selected via button:', renter);
                        onRenterSelected(renter);
                      }}
                    >
                      Select
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No renters found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Add New Renter Button */}
      <div className="border-t border-gray-700 pt-4">
        <Button variant="primary" onClick={() => setShowAddForm(true)} className="w-full">
          <UserPlus className="w-4 h-4 mr-2" />
          Add New Renter
        </Button>
      </div>

      {/* Cancel Button */}
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default RenterSearchForm;
