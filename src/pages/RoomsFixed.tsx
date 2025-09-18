import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { useSettings } from '../contexts/SettingsContext';
import { facilityService, roomService, leaseService, paymentScheduleService } from '../services/firebaseService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PaymentCapture from '../components/forms/PaymentCapture';
import PenaltyPaymentCapture from '../components/forms/PenaltyPaymentCapture';
import PenaltyBreakdown from '../components/forms/PenaltyBreakdown';
import { Facility, Room, Lease, PaymentTransaction } from '../types';

const RoomsFixed: React.FC = () => {
  console.log('RoomsFixed component is loading...');
  const { currentRole, isSystemAdmin } = useRole();
  const { allowStandardUserRooms } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'rooms' | 'payments'>('rooms');
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  
  // Modal states
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  const [showPenaltyPaymentCapture, setShowPenaltyPaymentCapture] = useState(false);
  const [showPenaltyBreakdown, setShowPenaltyBreakdown] = useState(false);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [selectedPenaltyTransaction, setSelectedPenaltyTransaction] = useState<PaymentTransaction | null>(null);
  const [selectedPenaltyForPayment, setSelectedPenaltyForPayment] = useState<any>(null);

  // Check if user can manage rooms
  const canManageRooms = isSystemAdmin || (currentRole === 'standard_user' && allowStandardUserRooms);

  useEffect(() => {
    loadFacilities();
  }, []);

  useEffect(() => {
    const facilityId = searchParams.get('facility');
    console.log('RoomsFixed - facilityId from URL:', facilityId);
    console.log('RoomsFixed - facilities loaded:', facilities.length);
    
    if (facilityId && facilities.length > 0) {
      const facility = facilities.find(f => f.id === facilityId);
      console.log('RoomsFixed - found facility:', facility);
      if (facility) {
        setSelectedFacility(facility);
        loadRooms(facilityId);
        // Load payment transactions for this facility
        loadPaymentTransactions(facilityId);
      }
    }
  }, [searchParams, facilities]);

  const loadFacilities = async () => {
    try {
      console.log('Loading facilities...');
      const facilitiesData = await facilityService.getFacilities();
      console.log('Facilities loaded:', facilitiesData);
      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Error loading facilities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRooms = async (facilityId: string) => {
    try {
      const roomsData = await roomService.getRooms(facilityId);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadPaymentTransactions = async (facilityId: string) => {
    setIsLoadingPayments(true);
    try {
      const transactions = await paymentScheduleService.getPaymentTransactionsByFacility(facilityId);
      setPaymentTransactions(transactions);
    } catch (error) {
      console.error('Error loading payment transactions:', error);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handleCapturePaymentFromTransaction = async (transaction: PaymentTransaction) => {
    console.log('Capture payment button clicked for transaction:', transaction);
    try {
      const lease = await leaseService.getLeaseById(transaction.leaseId);
      if (lease) {
        setSelectedLease(lease);
        setShowPaymentCapture(true);
        console.log('Payment capture modal should be opening');
      } else {
        console.error('Lease not found for transaction:', transaction.leaseId);
      }
    } catch (error) {
      console.error('Error fetching lease for payment capture:', error);
    }
  };

  const handleCapturePenaltyPayment = async (transaction: PaymentTransaction) => {
    console.log('Capture penalty payment button clicked for transaction:', transaction);
    try {
      const lease = await leaseService.getLeaseById(transaction.leaseId);
      if (lease) {
        setSelectedLease(lease);
        setSelectedPenaltyForPayment(transaction);
        setShowPenaltyPaymentCapture(true);
        console.log('Penalty payment capture modal should be opening');
      } else {
        console.error('Lease not found for penalty transaction:', transaction.leaseId);
      }
    } catch (error) {
      console.error('Error fetching lease for penalty payment capture:', error);
    }
  };

  const handleViewPenaltyBreakdown = async (transaction: PaymentTransaction) => {
    console.log('View penalty breakdown button clicked for transaction:', transaction);
    try {
      const lease = await leaseService.getLeaseById(transaction.leaseId);
      if (lease) {
        setSelectedLease(lease);
        setSelectedPenaltyTransaction(transaction);
        setShowPenaltyBreakdown(true);
        console.log('Penalty breakdown modal should be opening');
      } else {
        console.error('Lease not found for penalty breakdown:', transaction.leaseId);
      }
    } catch (error) {
      console.error('Error fetching lease for penalty breakdown:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto text-white">
          <h1 className="text-3xl font-bold mb-4">Room Management</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Individual facility management view
  if (selectedFacility) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto text-white">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{selectedFacility.name} - Room Management</h1>
              <p className="text-gray-400">Manage rooms and payments for this facility</p>
            </div>
            <Button
              onClick={() => {
                setSelectedFacility(null);
                navigate('/rooms');
              }}
              variant="secondary"
            >
              ← Back to All Facilities
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex space-x-4 mb-6">
            <Button
              onClick={() => setViewMode('rooms')}
              variant={viewMode === 'rooms' ? 'primary' : 'secondary'}
            >
              Rooms
            </Button>
            <Button
              onClick={() => setViewMode('payments')}
              variant={viewMode === 'payments' ? 'primary' : 'secondary'}
            >
              Payments
            </Button>
          </div>

          {/* Rooms View */}
          {viewMode === 'rooms' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Rooms</h2>
                {canManageRooms && (
                  <Button
                    onClick={() => {
                      // TODO: Implement add room functionality
                      console.log('Add room clicked');
                    }}
                    variant="primary"
                  >
                    + Add Room
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <Card key={room.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{room.number}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        room.status === 'occupied' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {room.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p><strong>Type:</strong> {room.type}</p>
                      <p><strong>Rent:</strong> R{room.rentAmount}</p>
                      <p><strong>Deposit:</strong> R{room.depositAmount}</p>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        onClick={() => {
                          // TODO: Implement edit room functionality
                          console.log('Edit room clicked:', room.id);
                        }}
                        variant="secondary"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          // TODO: Implement delete room functionality
                          console.log('Delete room clicked:', room.id);
                        }}
                        variant="danger"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Payments View */}
          {viewMode === 'payments' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Payment Transactions</h2>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => loadPaymentTransactions(selectedFacility.id!)}
                    variant="secondary"
                    size="sm"
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {isLoadingPayments ? (
                <p>Loading payment transactions...</p>
              ) : (
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Month
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Room
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Renter
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {paymentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                            {transaction.month}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                            {transaction.roomNumber || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                            {transaction.renterName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              transaction.type === 'rent' 
                                ? 'bg-blue-100 text-blue-800' 
                                : transaction.type === 'deposit'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                            R{transaction.amount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              transaction.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : transaction.status === 'overdue'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                            <div className="flex space-x-2">
                              {transaction.status === 'overdue' && (
                                <Button
                                  onClick={() => handleCapturePaymentFromTransaction(transaction)}
                                  variant="danger"
                                  size="sm"
                                >
                                  Capture Payment
                                </Button>
                              )}
                              {transaction.type === 'penalty' && transaction.status === 'pending' && (
                                <>
                                  <Button
                                    onClick={() => handleCapturePenaltyPayment(transaction)}
                                    variant="warning"
                                    size="sm"
                                  >
                                    Capture Penalty
                                  </Button>
                                  <Button
                                    onClick={() => handleViewPenaltyBreakdown(transaction)}
                                    variant="secondary"
                                    size="sm"
                                  >
                                    View Breakdown
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payment Capture Modal - Using React Portal */}
        {showPaymentCapture && selectedLease && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{zIndex: 9999}}>
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Payment Capture</h2>
                <button
                  onClick={() => {
                    console.log('Closing payment capture modal');
                    setShowPaymentCapture(false);
                    setSelectedLease(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <PaymentCapture
                lease={selectedLease}
                onSuccess={() => {
                  console.log('Payment capture success');
                  setShowPaymentCapture(false);
                  setSelectedLease(null);
                  // Reload payment transactions to show updated status
                  if (selectedFacility?.id) {
                    loadPaymentTransactions(selectedFacility.id);
                  }
                }}
                onCancel={() => {
                  console.log('Payment capture cancelled');
                  setShowPaymentCapture(false);
                  setSelectedLease(null);
                }}
              />
            </div>
          </div>,
          document.body
        )}

        {/* Penalty Payment Capture Modal - Using React Portal */}
        {showPenaltyPaymentCapture && selectedLease && selectedPenaltyForPayment && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{zIndex: 9999}}>
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Penalty Payment Capture</h2>
                <button
                  onClick={() => {
                    console.log('Closing penalty payment capture modal');
                    setShowPenaltyPaymentCapture(false);
                    setSelectedLease(null);
                    setSelectedPenaltyForPayment(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <PenaltyPaymentCapture
                lease={selectedLease}
                penaltyTransaction={selectedPenaltyForPayment}
                onSuccess={() => {
                  console.log('Penalty payment capture success');
                  setShowPenaltyPaymentCapture(false);
                  setSelectedLease(null);
                  setSelectedPenaltyForPayment(null);
                  // Reload payment transactions to show updated status
                  if (selectedFacility?.id) {
                    loadPaymentTransactions(selectedFacility.id);
                  }
                }}
                onCancel={() => {
                  console.log('Penalty payment capture cancelled');
                  setShowPenaltyPaymentCapture(false);
                  setSelectedLease(null);
                  setSelectedPenaltyForPayment(null);
                }}
              />
            </div>
          </div>,
          document.body
        )}

        {/* Penalty Breakdown Modal - Using React Portal */}
        {showPenaltyBreakdown && selectedLease && selectedPenaltyTransaction && createPortal(
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" style={{zIndex: 9999}}>
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">Penalty Breakdown</h2>
                <button
                  onClick={() => {
                    console.log('Closing penalty breakdown modal');
                    setShowPenaltyBreakdown(false);
                    setSelectedLease(null);
                    setSelectedPenaltyTransaction(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <PenaltyBreakdown
                lease={selectedLease}
                penaltyTransaction={selectedPenaltyTransaction}
                onClose={() => {
                  console.log('Penalty breakdown closed');
                  setShowPenaltyBreakdown(false);
                  setSelectedLease(null);
                  setSelectedPenaltyTransaction(null);
                }}
              />
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // Default view - show facility selection
  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto text-white">
        <h1 className="text-3xl font-bold mb-4">Room Management</h1>
        <p className="mb-6">Select a facility to manage its rooms and payments</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <Card key={facility.id} className="p-6 cursor-pointer hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{facility.name}</h3>
                <span className="text-sm text-gray-400">{rooms.length} rooms</span>
              </div>
              <p className="text-gray-300 mb-4">{facility.address}</p>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setSelectedFacility(facility);
                    loadRooms(facility.id!);
                    loadPaymentTransactions(facility.id!);
                  }}
                  variant="primary"
                  className="flex-1"
                >
                  Manage Rooms
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomsFixed;
