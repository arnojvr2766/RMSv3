import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  X, 
  Save, 
  Building2, 
  DoorClosed, 
  Calculator, 
  Plus, 
  Minus,
  AlertTriangle
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { maintenanceExpenseService } from '../../services/firebaseService';
import { Timestamp } from 'firebase/firestore';
import { useRole } from '../../contexts/RoleContext';

// Interfaces
interface MaintenanceExpense {
  id?: string;
  facilityId: string;
  roomIds: string[]; // Can be multiple rooms
  description: string;
  totalAmount: number;
  costSplitType: 'equal' | 'custom';
  roomCosts: {
    roomId: string;
    amount: number;
    recoverFromDeposit: boolean;
  }[];
  expenseDate: Timestamp;
  processedBy: string;
  status: 'pending' | 'completed';
  attachments?: string[]; // File URLs
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
interface Facility {
  id: string;
  name: string;
  address: string;
  primaryColor: string;
}

interface Room {
  id: string;
  roomNumber: string;
  facilityId: string;
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
}

interface RoomCost {
  roomId: string;
  amount: number;
  recoverFromDeposit: boolean;
}

interface MaintenanceExpenseFormProps {
  expense?: MaintenanceExpense | null;
  facilities: Facility[];
  rooms: Room[];
  onSuccess: () => void;
  onCancel: () => void;
}

const MaintenanceExpenseForm: React.FC<MaintenanceExpenseFormProps> = ({ 
  expense, 
  facilities, 
  rooms, 
  onSuccess, 
  onCancel 
}) => {
  const { currentRole } = useRole();
  const isEdit = !!expense;

  // Form state
  const [formData, setFormData] = useState({
    facilityId: expense?.facilityId || '',
    description: expense?.description || '',
    totalAmount: expense?.totalAmount || 0,
    expenseDate: expense?.expenseDate 
      ? (expense.expenseDate.toDate ? expense.expenseDate.toDate() : new Date(expense.expenseDate)).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    costSplitType: expense?.costSplitType || 'equal' as 'equal' | 'custom',
  });

  const [selectedRooms, setSelectedRooms] = useState<string[]>(expense?.roomIds || []);
  const [roomCosts, setRoomCosts] = useState<RoomCost[]>(expense?.roomCosts || []);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get filtered rooms for selected facility
  const filteredRooms = formData.facilityId 
    ? rooms.filter(room => room.facilityId === formData.facilityId)
    : [];

  // Update room costs when selected rooms or split type changes
  useEffect(() => {
    if (selectedRooms.length === 0) {
      setRoomCosts([]);
      return;
    }

    const newRoomCosts: RoomCost[] = selectedRooms.map(roomId => {
      const existingCost = roomCosts.find(rc => rc.roomId === roomId);
      return {
        roomId,
        amount: existingCost?.amount || 0,
        recoverFromDeposit: existingCost?.recoverFromDeposit || false,
      };
    });

    if (formData.costSplitType === 'equal' && formData.totalAmount > 0) {
      const amountPerRoom = formData.totalAmount / selectedRooms.length;
      newRoomCosts.forEach(rc => {
        rc.amount = amountPerRoom;
      });
    }

    setRoomCosts(newRoomCosts);
  }, [selectedRooms, formData.costSplitType, formData.totalAmount]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFacilityChange = (facilityId: string) => {
    setFormData(prev => ({ ...prev, facilityId }));
    setSelectedRooms([]); // Clear selected rooms when facility changes
    setRoomCosts([]);
  };

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms(prev => 
      prev.includes(roomId)
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    );
  };

  const handleRoomCostChange = (roomId: string, field: 'amount' | 'recoverFromDeposit', value: number | boolean) => {
    setRoomCosts(prev => 
      prev.map(rc => 
        rc.roomId === roomId ? { ...rc, [field]: value } : rc
      )
    );
  };

  const distributeEqualCosts = () => {
    if (selectedRooms.length === 0 || formData.totalAmount <= 0) return;

    const amountPerRoom = formData.totalAmount / selectedRooms.length;
    setRoomCosts(prev => 
      prev.map(rc => ({ ...rc, amount: amountPerRoom }))
    );
  };

  const getTotalRoomCosts = () => {
    return roomCosts.reduce((sum, rc) => sum + rc.amount, 0);
  };

  const getRecoverableAmount = () => {
    return roomCosts.filter(rc => rc.recoverFromDeposit).reduce((sum, rc) => sum + rc.amount, 0);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.facilityId) newErrors.facilityId = 'Please select a facility';
    if (!formData.description.trim()) newErrors.description = 'Please enter a description';
    if (formData.totalAmount <= 0) newErrors.totalAmount = 'Please enter a valid total amount';
    if (selectedRooms.length === 0) newErrors.rooms = 'Please select at least one room';
    if (!formData.expenseDate) newErrors.expenseDate = 'Please select an expense date';

    // Validate room costs
    if (formData.costSplitType === 'custom') {
      const totalRoomCosts = getTotalRoomCosts();
      if (Math.abs(totalRoomCosts - formData.totalAmount) > 0.01) {
        newErrors.roomCosts = `Room costs (R${totalRoomCosts.toFixed(2)}) must equal total amount (R${formData.totalAmount.toFixed(2)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const expenseData = {
        facilityId: formData.facilityId,
        roomIds: selectedRooms,
        description: formData.description.trim(),
        totalAmount: formData.totalAmount,
        costSplitType: formData.costSplitType,
        roomCosts: roomCosts,
        expenseDate: Timestamp.fromDate(new Date(formData.expenseDate)),
        processedBy: currentRole || 'system_admin',
        status: 'pending' as const,
        attachments: [], // Future feature for file uploads
      };

      if (isEdit && expense?.id) {
        await maintenanceExpenseService.updateMaintenanceExpense(expense.id, expenseData);
      } else {
        await maintenanceExpenseService.createMaintenanceExpense(expenseData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving maintenance expense:', error);
      alert('Failed to save maintenance expense. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    return room?.roomNumber || 'Unknown Room';
  };

  const getFacilityName = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    return facility?.name || 'Unknown Facility';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            {isEdit ? 'Edit Maintenance Expense' : 'Add Maintenance Expense'}
          </h2>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Expense Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Facility *
              </label>
              <select
                value={formData.facilityId}
                onChange={(e) => handleFacilityChange(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Select a facility</option>
                {facilities.map(facility => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
              {errors.facilityId && <p className="text-red-400 text-sm mt-1">{errors.facilityId}</p>}
            </div>

            <div>
              <Input
                label="Expense Date *"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => handleInputChange('expenseDate', e.target.value)}
                required
              />
              {errors.expenseDate && <p className="text-red-400 text-sm mt-1">{errors.expenseDate}</p>}
            </div>

            <div className="md:col-span-2">
              <Input
                label="Description *"
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the maintenance work performed"
                required
              />
              {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <Input
                label="Total Amount *"
                type="number"
                value={formData.totalAmount || ''}
                onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                placeholder="0.00"
                required
              />
              {errors.totalAmount && <p className="text-red-400 text-sm mt-1">{errors.totalAmount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Cost Split Type *
              </label>
              <select
                value={formData.costSplitType}
                onChange={(e) => handleInputChange('costSplitType', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="equal">Equal Split</option>
                <option value="custom">Custom Split</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Room Selection */}
        {formData.facilityId && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Select Rooms</h3>
              <div className="text-sm text-gray-400">
                {getFacilityName(formData.facilityId)} • {selectedRooms.length} room(s) selected
              </div>
            </div>
            
            {filteredRooms.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No rooms found for this facility</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredRooms.map(room => (
                  <div
                    key={room.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRooms.includes(room.id!)
                        ? 'border-orange-500 bg-orange-500/20'
                        : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                    }`}
                    onClick={() => handleRoomToggle(room.id!)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedRooms.includes(room.id!)}
                        onChange={() => handleRoomToggle(room.id!)}
                        className="text-orange-500"
                      />
                      <div>
                        <p className="text-white font-medium">{room.roomNumber}</p>
                        <p className="text-gray-400 text-xs capitalize">{room.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.rooms && <p className="text-red-400 text-sm mt-2">{errors.rooms}</p>}
          </Card>
        )}

        {/* Cost Distribution */}
        {selectedRooms.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-orange-500" />
                Cost Distribution
              </h3>
              {formData.costSplitType === 'equal' && (
                <Button type="button" variant="ghost" size="sm" onClick={distributeEqualCosts}>
                  <Calculator className="w-4 h-4 mr-2" />
                  Auto Calculate
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {roomCosts.map(roomCost => (
                <div key={roomCost.roomId} className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 flex-1">
                    <DoorClosed className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium">
                      {getRoomNumber(roomCost.roomId)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div>
                      <Input
                        type="number"
                        value={roomCost.amount || ''}
                        onChange={(e) => handleRoomCostChange(
                          roomCost.roomId, 
                          'amount', 
                          parseFloat(e.target.value) || 0
                        )}
                        min="0"
                        step="0.01"
                        className="w-24"
                        disabled={formData.costSplitType === 'equal'}
                      />
                    </div>

                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roomCost.recoverFromDeposit}
                        onChange={(e) => handleRoomCostChange(
                          roomCost.roomId, 
                          'recoverFromDeposit', 
                          e.target.checked
                        )}
                        className="text-orange-500"
                      />
                      <span className="text-gray-400 text-sm">Recover from deposit</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Cost Summary */}
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm">Total Expense</p>
                  <p className="text-white font-semibold">R{formData.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Allocated</p>
                  <p className={`font-semibold ${
                    Math.abs(getTotalRoomCosts() - formData.totalAmount) < 0.01 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    R{getTotalRoomCosts().toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Recoverable</p>
                  <p className="text-purple-400 font-semibold">R{getRecoverableAmount().toLocaleString()}</p>
                </div>
              </div>

              {Math.abs(getTotalRoomCosts() - formData.totalAmount) > 0.01 && (
                <div className="flex items-center justify-center mt-3 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Cost allocation doesn't match total amount
                </div>
              )}
            </div>

            {errors.roomCosts && <p className="text-red-400 text-sm mt-2">{errors.roomCosts}</p>}
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? 'Update Expense' : 'Create Expense'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MaintenanceExpenseForm;
