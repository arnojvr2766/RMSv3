import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, FileText, Building2, DoorClosed, Search, Filter, Eye, UserPlus, Grid3X3, List, DollarSign, Edit } from 'lucide-react';
import { renterService, leaseService, facilityService, roomService } from '../services/firebaseService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PaymentCapture from '../components/forms/PaymentCapture';
import RenterForm from '../components/forms/RenterForm';
import { Timestamp } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';

// Temporary inline type definitions
interface Renter {
  id?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    idNumber: string;
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
  status: 'active' | 'inactive' | 'blacklisted';
  notes?: string;
  createdAt: any;
  updatedAt: any;
}

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
  status: 'active' | 'expired' | 'terminated' | 'pending';
}

interface Facility {
  id?: string;
  name: string;
  address: string;
}

interface Room {
  id?: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
}

const Renters: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [renters, setRenters] = useState<Renter[]>([]);
  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterFacility, setFilterFacility] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [showPaymentCapture, setShowPaymentCapture] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [showRenterForm, setShowRenterForm] = useState(false);
  const [editingRenter, setEditingRenter] = useState<Renter | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Handle URL parameters for cross-navigation
  useEffect(() => {
    const facilityId = searchParams.get('facility');
    if (facilityId && facilities.length > 0) {
      // Auto-apply facility filter when navigating from Facilities page
      setFilterFacility(facilityId);
    }
  }, [searchParams, facilities]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rentersData, leasesData, facilitiesData, roomsData] = await Promise.all([
        renterService.getAllRenters(),
        leaseService.getAllLeases(),
        facilityService.getFacilities(),
        roomService.getAllRooms()
      ]);

      setRenters(rentersData);
      setLeases(leasesData);
      setFacilities(facilitiesData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error loading renters data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRenterLease = (renterId: string) => {
    return leases.find(lease => lease.renterId === renterId && lease.status === 'active');
  };

  const getFacilityName = (facilityId: string) => {
    return facilities.find(f => f.id === facilityId)?.name || 'Unknown Facility';
  };

  const getRoomNumber = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.roomNumber || 'Unknown Room';
  };

  const handleCapturePayment = async (renterId: string) => {
    try {
      const lease = leases.find(l => l.renterId === renterId && l.status === 'active');
      if (lease) {
        setSelectedLease(lease);
        setShowPaymentCapture(true);
      } else {
        alert('No active lease found for this renter.');
      }
    } catch (error) {
      console.error('Error fetching lease:', error);
      alert('Failed to load lease agreement. Please try again.');
    }
  };

  const formatDate = (date: any) => {
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const getRenterDisplayStatus = (renter: Renter) => {
    const activeLease = getRenterLease(renter.id!);
    if (renter.status === 'blacklisted') return 'blacklisted';
    if (activeLease) return 'active';
    return 'inactive';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'inactive': return 'bg-gray-500/20 text-gray-400';
      case 'blacklisted': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredRenters = renters.filter(renter => {
    const matchesSearch = !searchTerm || 
      renter.personalInfo.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renter.personalInfo.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renter.personalInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      renter.personalInfo.phone.includes(searchTerm) ||
      renter.personalInfo.idNumber.includes(searchTerm);
    
    const displayStatus = getRenterDisplayStatus(renter);
    const matchesStatus = !filterStatus || displayStatus === filterStatus;
    
    // Facility filtering: only show renters who have active leases at the selected facility
    const activeLease = getRenterLease(renter.id!);
    const matchesFacility = !filterFacility || (activeLease && activeLease.facilityId === filterFacility);
    
    return matchesSearch && matchesStatus && matchesFacility;
  });

  // Edit handlers
  const handleEditRenter = (renter: Renter) => {
    setEditingRenter(renter);
    setShowRenterForm(true);
  };

  const handleCloseRenterForm = () => {
    setShowRenterForm(false);
    setEditingRenter(null);
  };

  const handleRenterFormSuccess = () => {
    setShowRenterForm(false);
    setEditingRenter(null);
    loadData(); // Reload data to show updated renter
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-3 mb-8">
            <User className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Renters</h1>
              <p className="text-gray-400">Manage renter profiles, view lease status, track tenant information</p>
            </div>
          </div>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading renters...</p>
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
            <User className="w-8 h-8 text-primary-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Renters</h1>
              <p className="text-gray-400">Manage renter profiles, view lease status, track tenant information</p>
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
            <Button 
              variant="primary"
              onClick={() => {
                setEditingRenter(null); // No renter to edit, creating new one
                setShowRenterForm(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Renter
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search renters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>

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

            <Button 
              variant="secondary" 
              onClick={() => {
                setFilterStatus('');
                setFilterFacility('');
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
              <h3 className="text-2xl font-bold text-primary-500">{renters.length}</h3>
              <p className="text-gray-400">Total Renters</p>
            </div>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-500">
                {renters.filter(r => getRenterDisplayStatus(r) === 'active').length}
              </h3>
              <p className="text-gray-400">Active Renters</p>
            </div>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-500">
                {renters.filter(r => getRenterLease(r.id!)).length}
              </h3>
              <p className="text-gray-400">Currently Renting</p>
            </div>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-red-500">
                {renters.filter(r => getRenterDisplayStatus(r) === 'blacklisted').length}
              </h3>
              <p className="text-gray-400">Blacklisted</p>
            </div>
          </Card>
        </div>

        {/* Renters List */}
        {filteredRenters.length === 0 ? (
          <Card className="text-center py-8">
            <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Renters Found</h2>
            <p className="text-gray-400">
              {renters.length === 0 
                ? "No renters have been added yet."
                : "No renters match your current filters."
              }
            </p>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRenters.map((renter) => {
              const activeLease = getRenterLease(renter.id!);
              const displayStatus = getRenterDisplayStatus(renter);
              return (
                <Card key={renter.id} className="hover:bg-gray-700 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">
                          {renter.personalInfo.firstName} {renter.personalInfo.lastName}
                        </h3>
                        <p className="text-gray-400 text-sm">ID: {renter.personalInfo.idNumber}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(displayStatus)}`}>
                      {displayStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-primary-500" />
                      <span className="text-gray-400">Phone:</span>
                      <span className="text-white">{renter.personalInfo.phone}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-accent-blue-500" />
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{renter.personalInfo.email}</span>
                    </div>
                    
                    {activeLease ? (
                      <>
                        <div className="flex items-center space-x-3">
                          <Building2 className="w-4 h-4 text-green-500" />
                          <span className="text-gray-400">Currently Renting:</span>
                          <span className="text-white">{getFacilityName(activeLease.facilityId)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <DoorClosed className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-400">Room:</span>
                          <span className="text-white">{getRoomNumber(activeLease.roomId)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-400">Lease Period:</span>
                          <span className="text-white">
                            {formatDate(activeLease.terms.startDate)} - {formatDate(activeLease.terms.endDate)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-400">Monthly Rent:</span>
                          <span className="text-white font-medium">R{activeLease.terms.monthlyRent.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-400">Status:</span>
                        <span className="text-gray-500">Not currently renting</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditRenter(renter)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="primary" size="sm" className="flex-1">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      {activeLease && (
                        <>
                          <Button variant="accent" size="sm" className="flex-1">
                            <FileText className="w-4 h-4 mr-2" />
                            View Lease
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleCapturePayment(renter.id!)}
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Payments
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Renter</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Contact</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Current Lease</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRenters.map((renter) => {
                    const activeLease = getRenterLease(renter.id!);
                    const displayStatus = getRenterDisplayStatus(renter);
                    return (
                      <tr key={renter.id} className="border-b border-gray-700 hover:bg-gray-700 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-white font-medium">
                                {renter.personalInfo.firstName} {renter.personalInfo.lastName}
                              </div>
                              <div className="text-gray-400 text-sm">ID: {renter.personalInfo.idNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <span className="text-white">{renter.personalInfo.phone}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="text-white">{renter.personalInfo.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(displayStatus)}`}>
                            {displayStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {activeLease ? (
                            <div className="space-y-1">
                              <div className="text-white text-sm">
                                {getFacilityName(activeLease.facilityId)} - Room {getRoomNumber(activeLease.roomId)}
                              </div>
                              <div className="text-gray-400 text-xs">
                                R{activeLease.terms.monthlyRent.toLocaleString()}/month
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Not currently renting</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditRenter(renter)}
                              title="Edit Renter"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="View Details">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {activeLease && (
                              <>
                                <Button variant="accent" size="sm" title="View Lease">
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  onClick={() => handleCapturePayment(renter.id!)}
                                  title="Capture Payment"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
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

        {/* Renter Form Modal */}
        {showRenterForm && (
          <RenterForm
            renter={editingRenter}
            onClose={handleCloseRenterForm}
            onSuccess={handleRenterFormSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default Renters;