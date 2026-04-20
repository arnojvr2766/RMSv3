import React, { useState } from 'react';
import { DoorClosed, X } from 'lucide-react';
import { useRole } from '../../contexts/RoleContext';
import { roomStatusHistoryService, type RoomStatus } from '../../services/roomStatusHistoryService';
import { type Room } from '../../services/firebaseService';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface RoomStatusQuickUpdateProps {
  room: Room;
  onSuccess: () => void;
  onCancel: () => void;
}

const RoomStatusQuickUpdate: React.FC<RoomStatusQuickUpdateProps> = ({
  room,
  onSuccess,
  onCancel,
}) => {
  const { isSystemAdmin } = useRole();
  const [selectedStatus, setSelectedStatus] = useState<RoomStatus>(room.status as RoomStatus);
  const [occupancyState, setOccupancyState] = useState<'locked' | 'empty' | null>(
    room.lastOccupancyState || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When locked or empty is selected, require explicit selection
  const requiresOccupancyState = selectedStatus === 'locked' || selectedStatus === 'empty';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate that if status is locked or empty, occupancy state is selected
    if (requiresOccupancyState && !occupancyState) {
      setError('Please select whether the room is Locked or Empty');
      return;
    }

    setIsLoading(true);
    try {
      await roomStatusHistoryService.updateRoomStatus(
        room.id!,
        selectedStatus,
        occupancyState || undefined
      );
      onSuccess();
    } catch (err: any) {
      console.error('Error updating room status:', err);
      setError(err.message || 'Failed to update room status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roomStatuses: { value: RoomStatus; label: string; description: string }[] = [
    { value: 'available', label: 'Available', description: 'Room is ready for new tenant' },
    { value: 'occupied', label: 'Occupied', description: 'Room has active lease' },
    { value: 'maintenance', label: 'Under Maintenance', description: 'Room requires repairs' },
    { value: 'unavailable', label: 'Unavailable', description: 'Room is not available for rent' },
    { value: 'locked', label: 'Locked', description: 'Room is locked (official occupancy check)' },
    { value: 'empty', label: 'Empty', description: 'Room is empty (official occupancy check)' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0 pb-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
              <DoorClosed className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Update Room Status</h2>
              <p className="text-sm text-gray-400">Room: {room.roomNumber}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Current Status Display */}
          <div className="bg-gray-700/50 rounded-lg p-3">
            <p className="text-sm text-gray-400">Current Status</p>
            <p className="text-lg font-semibold text-white capitalize">{room.status}</p>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select New Status <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {roomStatuses.map((status) => (
                <label
                  key={status.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedStatus === status.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={selectedStatus === status.value}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value as RoomStatus);
                      // Reset occupancy state if switching away from locked/empty
                      if (e.target.value !== 'locked' && e.target.value !== 'empty') {
                        setOccupancyState(null);
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-white">{status.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{status.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Occupancy State Selection (for locked/empty only) */}
          {requiresOccupancyState && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-blue-300 mb-3">
                Occupancy Check <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">
                This selection becomes the official source of truth for occupancy checks.
              </p>
              <div className="space-y-2">
                <label
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    occupancyState === 'locked'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="occupancyState"
                    value="locked"
                    checked={occupancyState === 'locked'}
                    onChange={() => setOccupancyState('locked')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white">Locked</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Room is locked and will auto-switch to Occupied after payment
                    </div>
                  </div>
                </label>
                <label
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    occupancyState === 'empty'
                      ? 'border-blue-500 bg-blue-500/20'
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="occupancyState"
                    value="empty"
                    checked={occupancyState === 'empty'}
                    onChange={() => setOccupancyState('empty')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white">Empty</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Room is empty and requires deposit before rent
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex space-x-3 pt-4 mt-4 border-t border-gray-700 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || (requiresOccupancyState && !occupancyState)}
              className="flex-1"
            >
              {isLoading ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RoomStatusQuickUpdate;

