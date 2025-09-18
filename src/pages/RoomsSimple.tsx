import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import PaymentCapture from '../components/forms/PaymentCapture';

const RoomsSimple: React.FC = () => {
  console.log('RoomsSimple component is loading...');
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'rooms' | 'payments'>('payments');
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any>(null);

  useEffect(() => {
    const facilityId = searchParams.get('facility');
    console.log('RoomsSimple - facilityId from URL:', facilityId);
  }, [searchParams]);

  const handleCapturePayment = () => {
    console.log('Capture payment button clicked');
    // Create a mock lease for testing
    const mockLease = {
      id: 'test-lease',
      facilityId: 'test-facility',
      roomId: 'test-room',
      renterId: 'test-renter',
      terms: {
        rentAmount: 1100,
        depositAmount: 2200,
        leaseStartDate: new Date(),
        leaseEndDate: new Date()
      }
    };
    setSelectedLease(mockLease);
    setShowPaymentCapture(true);
  };

  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto text-white">
        <h1 className="text-3xl font-bold mb-4">Test Facility - Room Management</h1>
        
        <div className="flex space-x-4 mb-6">
          <Button onClick={() => setViewMode('rooms')} variant={viewMode === 'rooms' ? 'primary' : 'secondary'}>
            Rooms
          </Button>
          <Button onClick={() => setViewMode('payments')} variant={viewMode === 'payments' ? 'primary' : 'secondary'}>
            Payments
          </Button>
        </div>

        {viewMode === 'rooms' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Rooms</h2>
            <p>Room management view would go here</p>
          </div>
        )}

        {viewMode === 'payments' && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Payment Transactions</h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Room</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Renter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  <tr className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">2025-04</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">T202</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">Emma Taylor</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">R1,100</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">OVERDUE</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                      <Button onClick={handleCapturePayment} variant="danger" size="sm">
                        Capture Payment
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
    </div>
  );
};

export default RoomsSimple;
