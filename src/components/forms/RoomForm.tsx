import React, { useState } from 'react';
import { DoorClosed, Save, X, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { roomService } from '../../services/firebaseService';

// Temporary inline type definitions to isolate issues
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

interface Room {
  id?: string;
  facilityId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
  capacity: number;
  monthlyRent: number;
  depositAmount: number;
  amenities: string[];
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
    usesFacilityDefaults: boolean;
  };
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  description?: string;
  floorLevel?: number;
  squareMeters?: number;
  createdAt: any;
  updatedAt: any;
}

interface RoomFormProps {
  facility: Facility;
  onSuccess?: () => void;
  onCancel?: () => void;
  room?: Room;
  isEdit?: boolean;
}

const RoomForm: React.FC<RoomFormProps> = ({ 
  facility, 
  onSuccess, 
  onCancel, 
  room, 
  isEdit = false 
}) => {
  const [formData, setFormData] = useState({
    roomNumber: room?.roomNumber || '',
    type: room?.type || 'single' as const,
    capacity: room?.capacity || 1,
    monthlyRent: room?.monthlyRent || 0,
    depositAmount: room?.depositAmount || 0,
    description: room?.description || '',
    floorLevel: room?.floorLevel || 1,
    squareMeters: room?.squareMeters || 0,
    status: room?.status || 'available' as const,
    amenities: room?.amenities?.join(', ') || '',
    // Business Rules - default to facility rules or room's existing rules
    usesFacilityDefaults: room?.businessRules?.usesFacilityDefaults ?? true,
    lateFeeAmount: room?.businessRules?.lateFeeAmount || facility.defaultBusinessRules.lateFeeAmount,
    lateFeeStartDay: room?.businessRules?.lateFeeStartDay || facility.defaultBusinessRules.lateFeeStartDay,
    childSurcharge: room?.businessRules?.childSurcharge || facility.defaultBusinessRules.childSurcharge,
    gracePeriodDays: room?.businessRules?.gracePeriodDays || facility.defaultBusinessRules.gracePeriodDays,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleBusinessRules = () => {
    const newUsesFacilityDefaults = !formData.usesFacilityDefaults;
    setFormData(prev => ({
      ...prev,
      usesFacilityDefaults: newUsesFacilityDefaults,
      // If switching to facility defaults, reset to facility values
      ...(newUsesFacilityDefaults ? {
        lateFeeAmount: facility.defaultBusinessRules.lateFeeAmount,
        lateFeeStartDay: facility.defaultBusinessRules.lateFeeStartDay,
        childSurcharge: facility.defaultBusinessRules.childSurcharge,
        gracePeriodDays: facility.defaultBusinessRules.gracePeriodDays,
      } : {})
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.roomNumber.trim()) {
      newErrors.roomNumber = 'Room number is required';
    }

    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    if (formData.monthlyRent <= 0) {
      newErrors.monthlyRent = 'Monthly rent must be greater than 0';
    }

    if (formData.depositAmount < 0) {
      newErrors.depositAmount = 'Deposit amount cannot be negative';
    }

    if (!formData.usesFacilityDefaults) {
      if (formData.lateFeeAmount < 0) {
        newErrors.lateFeeAmount = 'Late fee amount cannot be negative';
      }
      if (formData.lateFeeStartDay < 1) {
        newErrors.lateFeeStartDay = 'Late fee start day must be at least 1';
      }
      if (formData.childSurcharge < 0) {
        newErrors.childSurcharge = 'Child surcharge cannot be negative';
      }
      if (formData.gracePeriodDays < 0) {
        newErrors.gracePeriodDays = 'Grace period days cannot be negative';
      }
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
      const roomData = {
        facilityId: facility.id!,
        roomNumber: formData.roomNumber.trim(),
        type: formData.type,
        capacity: formData.capacity,
        monthlyRent: formData.monthlyRent,
        depositAmount: formData.depositAmount,
        description: formData.description.trim(),
        floorLevel: formData.floorLevel,
        squareMeters: formData.squareMeters || undefined,
        status: formData.status,
        amenities: formData.amenities
          .split(',')
          .map(a => a.trim())
          .filter(a => a.length > 0),
        businessRules: {
          usesFacilityDefaults: formData.usesFacilityDefaults,
          lateFeeAmount: formData.usesFacilityDefaults 
            ? facility.defaultBusinessRules.lateFeeAmount 
            : formData.lateFeeAmount,
          lateFeeStartDay: formData.usesFacilityDefaults 
            ? facility.defaultBusinessRules.lateFeeStartDay 
            : formData.lateFeeStartDay,
          childSurcharge: formData.usesFacilityDefaults 
            ? facility.defaultBusinessRules.childSurcharge 
            : formData.childSurcharge,
          gracePeriodDays: formData.usesFacilityDefaults 
            ? facility.defaultBusinessRules.gracePeriodDays 
            : formData.gracePeriodDays,
          paymentMethods: facility.defaultBusinessRules.paymentMethods, // Always inherit payment methods
        },
      };

      if (isEdit && room?.id) {
        await roomService.updateRoom(room.id, roomData);
      } else {
        await roomService.createRoom(roomData);
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error saving room:', error);
      alert('Failed to save room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roomTypes = [
    { value: 'single', label: 'Single Room' },
    { value: 'double', label: 'Double Room' },
    { value: 'family', label: 'Family Room' },
    { value: 'studio', label: 'Studio Apartment' },
  ];

  const roomStatuses = [
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'maintenance', label: 'Under Maintenance' },
    { value: 'unavailable', label: 'Unavailable' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: facility.primaryColor }}
              >
                <DoorClosed className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isEdit ? 'Edit Room' : 'Add New Room'}
                </h2>
                <p className="text-gray-400">
                  {facility.name} - {facility.address}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Room Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Room Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Room Number"
                  value={formData.roomNumber}
                  onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                  error={errors.roomNumber}
                  required
                  placeholder="e.g., 101, A1, etc."
                />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Room Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {roomTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Capacity (Guests)"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 1)}
                  error={errors.capacity}
                  required
                  min="1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Monthly Rent (R)"
                  type="number"
                  value={formData.monthlyRent}
                  onChange={(e) => handleInputChange('monthlyRent', parseFloat(e.target.value) || 0)}
                  error={errors.monthlyRent}
                  required
                  min="0"
                  placeholder="0.00"
                />

                <Input
                  label="Deposit Amount (R)"
                  type="number"
                  value={formData.depositAmount}
                  onChange={(e) => handleInputChange('depositAmount', parseFloat(e.target.value) || 0)}
                  error={errors.depositAmount}
                  min="0"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Additional Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Floor Level"
                  type="number"
                  value={formData.floorLevel}
                  onChange={(e) => handleInputChange('floorLevel', parseInt(e.target.value) || 1)}
                  min="1"
                />

                <Input
                  label="Square Meters (m²)"
                  type="number"
                  value={formData.squareMeters || ''}
                  onChange={(e) => handleInputChange('squareMeters', parseFloat(e.target.value) || 0)}
                  min="0"
                  placeholder="Optional"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {roomStatuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Optional room description"
              />

              <Input
                label="Amenities"
                value={formData.amenities}
                onChange={(e) => handleInputChange('amenities', e.target.value)}
                placeholder="e.g., WiFi, AC, Private Bathroom, Kitchen Access (comma-separated)"
              />
            </div>

            {/* Business Rules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                <h3 className="text-lg font-semibold text-white">
                  Business Rules
                </h3>
                <button
                  type="button"
                  onClick={toggleBusinessRules}
                  className="flex items-center space-x-2 text-primary-500 hover:text-primary-400 transition-colors"
                >
                  {formData.usesFacilityDefaults ? (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      <span className="text-sm">Using Facility Defaults</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      <span className="text-sm">Custom Rules</span>
                    </>
                  )}
                </button>
              </div>

              {formData.usesFacilityDefaults ? (
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Building2 className="w-5 h-5 text-primary-500" />
                    <span className="text-white font-medium">Inheriting from {facility.name}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Late Fee:</span>
                      <span className="text-white ml-2">R{facility.defaultBusinessRules.lateFeeAmount}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Start Day:</span>
                      <span className="text-white ml-2">{facility.defaultBusinessRules.lateFeeStartDay}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Child Fee:</span>
                      <span className="text-white ml-2">R{facility.defaultBusinessRules.childSurcharge}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Grace Period:</span>
                      <span className="text-white ml-2">{facility.defaultBusinessRules.gracePeriodDays} days</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mt-2">
                    Click the toggle above to customize these rules for this room
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Late Fee Amount (R)"
                    type="number"
                    value={formData.lateFeeAmount}
                    onChange={(e) => handleInputChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
                    error={errors.lateFeeAmount}
                    min="0"
                  />

                  <Input
                    label="Late Fee Start Day"
                    type="number"
                    value={formData.lateFeeStartDay}
                    onChange={(e) => handleInputChange('lateFeeStartDay', parseInt(e.target.value) || 1)}
                    error={errors.lateFeeStartDay}
                    min="1"
                  />

                  <Input
                    label="Child Surcharge (R)"
                    type="number"
                    value={formData.childSurcharge}
                    onChange={(e) => handleInputChange('childSurcharge', parseFloat(e.target.value) || 0)}
                    error={errors.childSurcharge}
                    min="0"
                  />

                  <Input
                    label="Grace Period (Days)"
                    type="number"
                    value={formData.gracePeriodDays}
                    onChange={(e) => handleInputChange('gracePeriodDays', parseInt(e.target.value) || 0)}
                    error={errors.gracePeriodDays}
                    min="0"
                  />
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
              <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Room')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default RoomForm;
