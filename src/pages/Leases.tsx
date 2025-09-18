import React, { useState, useEffect } from 'react';
import { FileText, Building2, DoorClosed, User, Calendar, DollarSign, Filter, Search, Eye, CreditCard, Grid3X3, List } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { leaseService, facilityService, renterService, roomService } from '../services/firebaseService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import LeaseView from '../components/forms/LeaseView';
import PaymentCapture from '../components/forms/PaymentCapture';
import { Timestamp } from 'firebase/firestore';

// Temporary inline type definitions
interface LeaseAgreement {
  id?: string;
  facilityId: string;
  roomId: string;
  renterId: string;
  terms: {
    startDate: any;
    endDate: any;
    monthlyRent: number;
    depositAmount: number;
    depositPaid: boolean;
    depositPaidDate?: any;
  };
  businessRules: {
    lateFeeAmount: number;
    lateFeeStartDay: number;
    childSurcharge: number;
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  additionalTerms?: string;
  status: 'active' | 'expired' | 'terminated' | 'pending';
  createdAt: any;
  updatedAt: any;
}

interface Facility {
  id?: string;
  name: string;
  address: string;
  billingEntity: string;
}

interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
}

interface Room {
  id?: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
}

const Leases: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLease, setSelectedLease] = useState<LeaseAgreement | null>(null);
  const [showLeaseView, setShowLeaseView] = useState(false);
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  const [filterFacility, setFilterFacility] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table'); // Default to table

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const facilityId = searchParams.get('facility');
    if (facilityId) {
      setFilterFacility(facilityId);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [leasesData, facilitiesData, rentersData, roomsData] = await Promise.all([
        leaseService.getAllLeases(),
        facilityService.getFacilities(),
        renterService.getAllRenters(),
        roomService.getAllRooms()
      ]);

      setLeases(leasesData);
      setFacilities(facilitiesData);
      setRenters(rentersData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading leases data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewLease = (lease: LeaseAgreement) => {
    setSelectedLease(lease);
    setShowLeaseView(true);
  };

  const handleCapturePayment = (lease: LeaseAgreement) => {
    setSelectedLease(lease);
    setShowPaymentCapture(true);
  };

  const formatDate = (date: any) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'expired': return 'bg-gray-500/20 text-gray-400';
      case 'terminated': return 'bg-red-500/20 text-red-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getFacilityName = (facilityId: string) => {
    return facilities.find(f => f.id === facilityId)?.name || 'Unknown Facility';
  };

  const getRenterName = (renterId: string) => {
    const renter = renters.find(r => r.id === renterId);
    return renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter';
  };

  const getRoomNumber = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.roomNumber || 'Unknown Room';
  };

  const filteredLeases = leases.filter(lease => {
    const matchesFacility = !filterFacility || lease.facilityId === filterFacility;
    const matchesStatus = !filterStatus || lease.status === filterStatus;
    const matchesSearch = !searchTerm || 
      getFacilityName(lease.facilityId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRenterName(lease.renterId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRoomNumber(lease.roomId).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFacility && matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3 mb-8">
            <FileText className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Leases</h1>
              <p className="text-gray-400">Manage lease agreements, view active contracts, track lease terms</p>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading leases...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Leases</h1>
              <p className="text-gray-400">Manage lease agreements, view active contracts, track lease terms</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'cards' 
                    ? 'bg-primary-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span className="text-sm font-medium">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-primary-500 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search leases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Facilities</option>
              {facilities.map(facility => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
              <option value="pending">Pending</option>
            </select>

            <Button 
              variant="secondary" 
              onClick={() => {
                setFilterFacility('');
                setFilterStatus('');
                setSearchTerm('');
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-primary-500/10 border-primary-500/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-primary-500">{leases.length}</h3>
              <p className="text-gray-400">Total Leases</p>
            </div>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-500">
                {leases.filter(l => l.status === 'active').length}
              </h3>
              <p className="text-gray-400">Active Leases</p>
            </div>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-yellow-500">
                {leases.filter(l => l.status === 'pending').length}
              </h3>
              <p className="text-gray-400">Pending Leases</p>
            </div>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-red-500">
                {leases.filter(l => l.status === 'expired' || l.status === 'terminated').length}
              </h3>
              <p className="text-gray-400">Ended Leases</p>
            </div>
          </Card>
        </div>

        {/* Leases List */}
        {filteredLeases.length === 0 ? (
          <Card className="text-center py-8">
            <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Leases Found</h2>
            <p className="text-gray-400">
              {leases.length === 0 
                ? "No lease agreements have been created yet."
                : "No leases match your current filters."
              }
            </p>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredLeases.map((lease) => (
              <Card key={lease.id} className="hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Lease Agreement</h3>
                      <p className="text-gray-400 text-sm">ID: {lease.id}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lease.status)}`}>
                    {lease.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-primary-500" />
                    <span className="text-gray-400">Facility:</span>
                    <span className="text-white">{getFacilityName(lease.facilityId)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DoorClosed className="w-4 h-4 text-accent-blue-500" />
                    <span className="text-gray-400">Room:</span>
                    <span className="text-white">{getRoomNumber(lease.roomId)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-green-500" />
                    <span className="text-gray-400">Renter:</span>
                    <span className="text-white">{getRenterName(lease.renterId)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-yellow-500" />
                    <span className="text-gray-400">Period:</span>
                    <span className="text-white">
                      {formatDate(lease.terms.startDate)} - {formatDate(lease.terms.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <span className="text-gray-400">Monthly Rent:</span>
                    <span className="text-white font-medium">R{lease.terms.monthlyRent.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <div className="flex space-x-2">
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => handleViewLease(lease)}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="accent" 
                      size="sm" 
                      onClick={() => handleCapturePayment(lease)}
                      className="flex-1"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payments
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View */
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Lease ID</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Facility</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Room</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Renter</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Period</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Monthly Rent</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeases.map((lease) => (
                    <tr key={lease.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="text-white font-medium text-sm">
                          {lease.id?.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white text-sm">
                          {getFacilityName(lease.facilityId)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white text-sm">
                          {getRoomNumber(lease.roomId)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white text-sm">
                          {getRenterName(lease.renterId)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white text-sm">
                          {formatDate(lease.terms.startDate)} - {formatDate(lease.terms.endDate)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white font-medium text-sm">
                          R{lease.terms.monthlyRent.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(lease.status)}`}>
                          {lease.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewLease(lease)}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => handleCapturePayment(lease)}
                            title="Capture Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Lease View Modal */}
        {showLeaseView && selectedLease && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
              <LeaseView
                lease={selectedLease}
                onClose={() => {
                  setShowLeaseView(false);
                  setSelectedLease(null);
                }}
                onCapturePayment={() => {
                  setShowLeaseView(false);
                  setShowPaymentCapture(true);
                }}
              />
            </div>
          </div>
        )}

        {/* Payment Capture Modal */}
        {showPaymentCapture && selectedLease && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <PaymentCapture
                lease={selectedLease}
                onSuccess={() => {
                  setShowPaymentCapture(false);
                  setSelectedLease(null);
                  // Reload data to update any changes
                  loadData();
                }}
                onCancel={() => {
                  setShowPaymentCapture(false);
                  setSelectedLease(null);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leases;