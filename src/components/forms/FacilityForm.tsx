import React, { useState } from 'react';
import { Building2, Save, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { facilityService } from '../../services/firebaseService';

// Temporary inline type definition to isolate the issue
interface Facility {
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
  createdAt: any;
  updatedAt: any;
}

interface FacilityFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  facility?: Facility;
  isEdit?: boolean;
}

const FacilityForm: React.FC<FacilityFormProps> = ({ 
  onSuccess, 
  onCancel, 
  facility, 
  isEdit = false 
}) => {
  const [formData, setFormData] = useState({
    name: facility?.name || '',
    address: facility?.address || '',
    billingEntity: facility?.billingEntity || '',
    phone: facility?.contactInfo?.phone || '',
    email: facility?.contactInfo?.email || '',
    lateFeeAmount: facility?.defaultBusinessRules?.lateFeeAmount || (facility as any)?.settings?.lateFeeAmount || 20,
    lateFeeStartDay: facility?.defaultBusinessRules?.lateFeeStartDay || (facility as any)?.settings?.lateFeeStartDay || 4,
    childSurcharge: facility?.defaultBusinessRules?.childSurcharge || (facility as any)?.settings?.childSurcharge || 10,
    gracePeriodDays: facility?.defaultBusinessRules?.gracePeriodDays || (facility as any)?.settings?.gracePeriodDays || 7,
    primaryColor: facility?.primaryColor || '#FFD300',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Facility name is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.billingEntity.trim()) {
      newErrors.billingEntity = 'Billing entity is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.lateFeeAmount < 0) {
      newErrors.lateFeeAmount = 'Late fee amount cannot be negative';
    }

    if (formData.lateFeeStartDay < 1 || formData.lateFeeStartDay > 31) {
      newErrors.lateFeeStartDay = 'Late fee start day must be between 1 and 31';
    }

    if (formData.childSurcharge < 0) {
      newErrors.childSurcharge = 'Child surcharge cannot be negative';
    }

    if (formData.gracePeriodDays < 0) {
      newErrors.gracePeriodDays = 'Grace period cannot be negative';
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
      const facilityData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        billingEntity: formData.billingEntity.trim(),
        contactInfo: {
          phone: formData.phone.trim(),
          email: formData.email.trim(),
        },
        defaultBusinessRules: {
          lateFeeAmount: formData.lateFeeAmount,
          lateFeeStartDay: formData.lateFeeStartDay,
          childSurcharge: formData.childSurcharge,
          gracePeriodDays: formData.gracePeriodDays,
          paymentMethods: ['cash', 'eft', 'mobile', 'card'],
        },
        primaryColor: formData.primaryColor,
        status: 'active' as const,
      };

      if (isEdit && facility?.id) {
        await facilityService.updateFacility(facility.id, facilityData);
      } else {
        await facilityService.createFacility(facilityData);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving facility:', error);
      setErrors({ submit: 'Failed to save facility. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
          <Building2 className="w-6 h-6 text-secondary-900" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          {isEdit ? 'Edit Facility' : 'Add New Facility'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
            Basic Information
          </h3>
          
          <Input
            label="Facility Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={errors.name}
            required
            placeholder="Enter facility name"
          />

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            error={errors.address}
            required
            placeholder="Enter full address"
          />

          <Input
            label="Billing Entity"
            value={formData.billingEntity}
            onChange={(e) => handleInputChange('billingEntity', e.target.value)}
            error={errors.billingEntity}
            required
            placeholder="Enter billing entity name for reporting"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={errors.phone}
              required
              placeholder="Enter phone number"
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              required
              placeholder="Enter email address"
            />
          </div>
        </div>

        {/* Default Business Rules */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
            Default Business Rules
          </h3>
          <p className="text-gray-400 text-sm">
            These default rules will be inherited by all rooms in this facility but can be overridden per room.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Late Fee Amount (R)"
              type="number"
              value={formData.lateFeeAmount}
              onChange={(e) => handleInputChange('lateFeeAmount', Number(e.target.value))}
              error={errors.lateFeeAmount}
              required
              min="0"
            />

            <Input
              label="Late Fee Start Day"
              type="number"
              value={formData.lateFeeStartDay}
              onChange={(e) => handleInputChange('lateFeeStartDay', Number(e.target.value))}
              error={errors.lateFeeStartDay}
              required
              min="1"
              max="31"
            />

            <Input
              label="Child Surcharge (R)"
              type="number"
              value={formData.childSurcharge}
              onChange={(e) => handleInputChange('childSurcharge', Number(e.target.value))}
              error={errors.childSurcharge}
              required
              min="0"
            />

            <Input
              label="Grace Period (Days)"
              type="number"
              value={formData.gracePeriodDays}
              onChange={(e) => handleInputChange('gracePeriodDays', Number(e.target.value))}
              error={errors.gracePeriodDays}
              required
              min="0"
            />
          </div>
        </div>

        {/* Branding */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
            Branding
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-600 bg-gray-700"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  placeholder="#FFD300"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  className="w-12 h-10 rounded border border-gray-600 bg-gray-700"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  placeholder="#1A1A1A"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            disabled={isLoading}
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : (isEdit ? 'Update Facility' : 'Create Facility')}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default FacilityForm;
