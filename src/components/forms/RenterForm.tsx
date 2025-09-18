import React, { useState } from 'react';
import { X, Save, User, Phone, Mail, Building2, Briefcase, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { renterService } from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';

interface RenterFormProps {
  renter?: any; // Renter to edit, undefined for new renter
  onClose: () => void;
  onSuccess: () => void;
}

interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    idNumber: string;
    dateOfBirth: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  employmentInfo: {
    employer: string;
    position: string;
    monthlyIncome: number;
    employmentType: 'full-time' | 'part-time' | 'contract' | 'self-employed';
  };
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const RenterForm: React.FC<RenterFormProps> = ({ renter, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: renter?.personalInfo?.firstName || '',
    lastName: renter?.personalInfo?.lastName || '',
    email: renter?.personalInfo?.email || '',
    phone: renter?.personalInfo?.phone || '',
    idNumber: renter?.personalInfo?.idNumber || '',
    dateOfBirth: renter?.personalInfo?.dateOfBirth || '',
    emergencyName: renter?.emergencyContact?.name || '',
    emergencyRelationship: renter?.emergencyContact?.relationship || '',
    emergencyPhone: renter?.emergencyContact?.phone || '',
    employer: renter?.employmentInfo?.employer || '',
    position: renter?.employmentInfo?.position || '',
    monthlyIncome: renter?.employmentInfo?.monthlyIncome || 0,
    employmentType: renter?.employmentInfo?.employmentType || 'full-time',
    status: renter?.status || 'active'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Only first name is required
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    // Optional field validation (only if field has content)
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (formData.monthlyIncome < 0) {
      newErrors.monthlyIncome = 'Monthly income cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const renterData = {
        personalInfo: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          idNumber: formData.idNumber.trim(),
          dateOfBirth: formData.dateOfBirth
        },
        emergencyContact: {
          name: formData.emergencyName.trim(),
          relationship: formData.emergencyRelationship.trim(),
          phone: formData.emergencyPhone.trim()
        },
        employmentInfo: {
          employer: formData.employer.trim(),
          position: formData.position.trim(),
          monthlyIncome: formData.monthlyIncome,
          employmentType: formData.employmentType as 'full-time' | 'part-time' | 'contract' | 'self-employed'
        },
        status: formData.status as 'active' | 'inactive'
      };

      if (renter?.id) {
        // Update existing renter
        await renterService.updateRenter(renter.id, renterData);
      } else {
        // Create new renter
        await renterService.createRenter(renterData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving renter:', error);
      setErrors({ submit: 'Failed to save renter. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                {renter ? 'Edit Renter' : 'Add New Renter'}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{errors.submit}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <User className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-white">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  error={errors.firstName}
                  required
                />
                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  error={errors.lastName}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  error={errors.phone}
                />
                <Input
                  label="ID Number"
                  value={formData.idNumber}
                  onChange={(e) => handleInputChange('idNumber', e.target.value)}
                  error={errors.idNumber}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  error={errors.dateOfBirth}
                />
              </div>
            </Card>

            {/* Emergency Contact */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Phone className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-white">Emergency Contact</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Contact Name"
                  value={formData.emergencyName}
                  onChange={(e) => handleInputChange('emergencyName', e.target.value)}
                  error={errors.emergencyName}
                />
                <Input
                  label="Relationship"
                  value={formData.emergencyRelationship}
                  onChange={(e) => handleInputChange('emergencyRelationship', e.target.value)}
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
                <Input
                  label="Contact Phone"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                  error={errors.emergencyPhone}
                />
              </div>
            </Card>

            {/* Employment Information */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Briefcase className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-white">Employment Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Employer"
                  value={formData.employer}
                  onChange={(e) => handleInputChange('employer', e.target.value)}
                  error={errors.employer}
                />
                <Input
                  label="Position"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  error={errors.position}
                />
                <Input
                  label="Monthly Income"
                  type="number"
                  min="0"
                  value={formData.monthlyIncome}
                  onChange={(e) => handleInputChange('monthlyIncome', parseFloat(e.target.value) || 0)}
                  error={errors.monthlyIncome}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => handleInputChange('employmentType', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="self-employed">Self-employed</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Status */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Building2 className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-white">Status</h3>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Renter Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : (renter ? 'Update Renter' : 'Create Renter')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RenterForm;
