import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Eye, DoorClosed, FileText, DollarSign, UserPlus, Grid3X3, Table, Search, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { useSettings } from '../contexts/SettingsContext';
import { facilityService } from '../services/firebaseService';
import { facilityStatsService } from '../services/facilityStatsService';

// Facility statistics interface
interface FacilityStats {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  roomsWithPenalties: number;
  penaltyRate: number;
}

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
import FacilityForm from '../components/forms/FacilityForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Facilities: React.FC = () => {
  const { currentRole, isSystemAdmin } = useRole();
  const { allowStandardUserFacilities, allowStandardUserRooms } = useSettings();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityStats, setFacilityStats] = useState<Record<string, FacilityStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  
  // View and search state
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof Facility | 'totalRooms' | 'occupiedRooms' | 'availableRooms' | 'maintenanceRooms' | 'roomsWithPenalties'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Check if user can manage facilities
  const canManageFacilities = isSystemAdmin || (currentRole === 'standard_user' && allowStandardUserFacilities);
  
  // Check if user can manage rooms
  const canManageRooms = isSystemAdmin || (currentRole === 'standard_user' && allowStandardUserRooms);

  // Load facilities
  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    try {
      setIsLoading(true);
      const facilitiesData = await facilityService.getFacilities();
      setFacilities(facilitiesData);
      
      // Load statistics for all facilities
      if (facilitiesData.length > 0) {
        const facilityIds = facilitiesData.map(f => f.id).filter(Boolean) as string[];
        const stats = await facilityStatsService.getMultipleFacilityStats(facilityIds);
        setFacilityStats(stats);
      }
    } catch (error) {
      console.error('Error loading facilities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingFacility(null);
    loadFacilities();
  };

  const handleEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setShowForm(true);
  };

  const handleDelete = async (facilityId: string) => {
    if (window.confirm('Are you sure you want to delete this facility? This action cannot be undone.')) {
      try {
        await facilityService.deleteFacility(facilityId);
        loadFacilities();
      } catch (error) {
        console.error('Error deleting facility:', error);
        alert('Failed to delete facility. Please try again.');
      }
    }
  };

  // Filter and sort facilities
  const filteredAndSortedFacilities = facilities
    .filter(facility => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        facility.name.toLowerCase().includes(searchLower) ||
        facility.address.toLowerCase().includes(searchLower) ||
        facility.billingEntity.toLowerCase().includes(searchLower) ||
        facility.contactInfo.phone.includes(searchTerm) ||
        facility.contactInfo.email.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortField === 'totalRooms' || sortField === 'occupiedRooms' || sortField === 'availableRooms' || sortField === 'maintenanceRooms' || sortField === 'roomsWithPenalties') {
        aValue = a.id ? facilityStats[a.id]?.[sortField] || 0 : 0;
        bValue = b.id ? facilityStats[b.id]?.[sortField] || 0 : 0;
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

  const handleSort = (field: keyof Facility | 'totalRooms' | 'occupiedRooms' | 'availableRooms' | 'maintenanceRooms' | 'roomsWithPenalties') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };


  if (showForm) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto">
          <FacilityForm
            facility={editingFacility || undefined}
            isEdit={!!editingFacility}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingFacility(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-secondary-900" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Facilities</h1>
                <p className="text-gray-400 text-lg">
                  Manage your rental properties, buildings, and facility settings
                </p>
              </div>
            </div>
            
            {canManageFacilities && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Facility
              </Button>
            )}
          </div>

          {/* Search and View Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search facilities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 w-64"
                />
              </div>
              
              {/* Results count */}
              <span className="text-gray-400 text-sm">
                {filteredAndSortedFacilities.length} of {facilities.length} facilities
              </span>
            </div>

            {/* View Toggle */}
            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Access Control Message */}
        {!canManageFacilities && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Building2 className="w-5 h-5 text-yellow-500" />
              <div>
                <h3 className="text-yellow-500 font-medium">Access Restricted</h3>
                <p className="text-gray-400 text-sm">
                  You don't have permission to manage facilities. Contact your administrator or enable this feature in Settings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Facilities List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : facilities.length === 0 ? (
          <Card className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Facilities Found</h2>
            <p className="text-gray-400 mb-6">
              {canManageFacilities 
                ? 'Get started by adding your first facility'
                : 'No facilities are available to view'
              }
            </p>
            {canManageFacilities && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Facility
              </Button>
            )}
          </Card>
        ) : filteredAndSortedFacilities.length === 0 ? (
          <Card className="text-center py-12">
            <Search className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Facilities Match Your Search</h2>
            <p className="text-gray-400 mb-6">
              Try adjusting your search terms or clear the search to see all facilities.
            </p>
            <Button onClick={() => setSearchTerm('')}>
              Clear Search
            </Button>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedFacilities.map((facility) => (
              <Card key={facility.id} className="hover:bg-gray-700 transition-colors">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: facility.primaryColor }}
                      >
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{facility.name}</h3>
                        <p className="text-gray-400 text-sm">{facility.address}</p>
                        <p className="text-gray-500 text-xs">Billing: {facility.billingEntity}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        facility.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {facility.status}
                      </div>
                      {canManageFacilities && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEdit(facility)}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="Edit Facility"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => facility.id && handleDelete(facility.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete Facility"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>📞</span>
                      <span>{facility.contactInfo.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>✉️</span>
                      <span>{facility.contactInfo.email}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-400">Late Fee:</span>
                        <span className="text-white ml-1">R{facility.defaultBusinessRules?.lateFeeAmount || (facility as any).settings?.lateFeeAmount || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Child Surcharge:</span>
                        <span className="text-white ml-1">R{facility.defaultBusinessRules?.childSurcharge || (facility as any).settings?.childSurcharge || 0}</span>
                      </div>
                    </div>
                    
                    {/* Facility Statistics */}
                    {facility.id && facilityStats[facility.id] && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Total Rooms:</span>
                          <span className="text-white font-medium">{facilityStats[facility.id].totalRooms}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Occupied:</span>
                          <span className="text-green-400 font-medium">{facilityStats[facility.id].occupiedRooms}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Available:</span>
                          <span className="text-blue-400 font-medium">{facilityStats[facility.id].availableRooms}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Maintenance:</span>
                          <span className="text-orange-400 font-medium">{facilityStats[facility.id].maintenanceRooms}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">With Penalties:</span>
                          <span className="text-red-400 font-medium">{facilityStats[facility.id].roomsWithPenalties}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Penalty Rate:</span>
                          <span className={`font-medium ${
                            facilityStats[facility.id].penaltyRate > 50 ? 'text-red-400' : 
                            facilityStats[facility.id].penaltyRate > 25 ? 'text-yellow-400' : 
                            'text-green-400'
                          }`}>
                            {facilityStats[facility.id].penaltyRate}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-3">
                      {canManageRooms && (
                        <button
                          onClick={() => {
                            console.log('Navigating to rooms for facility:', facility.id);
                            navigate(`/rooms?facility=${facility.id}`);
                          }}
                          className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 border-blue-500 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        >
                          <DoorClosed className="w-5 h-5" />
                          <span>Rooms</span>
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          console.log('Navigating to leases for facility:', facility.id);
                          navigate(`/leases?facility=${facility.id}`);
                        }}
                        className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 border-green-500 bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                      >
                        <FileText className="w-5 h-5" />
                        <span>Leases</span>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <button
                        onClick={() => {
                          console.log('Navigating to payments for facility:', facility.id);
                          navigate(`/payments?facility=${facility.id}`);
                        }}
                        className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 border-yellow-500 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                      >
                        <DollarSign className="w-5 h-5" />
                        <span>Payments</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          console.log('Navigating to renters for facility:', facility.id);
                          navigate(`/renters?facility=${facility.id}`);
                        }}
                        className="flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 border-purple-500 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                      >
                        <UserPlus className="w-5 h-5" />
                        <span>Renters</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Table View */
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                      >
                        <span>Facility</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('billingEntity')}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                      >
                        <span>Billing</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('totalRooms')}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                      >
                        <span>Total Rooms</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('occupiedRooms')}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                      >
                        <span>Occupied</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('availableRooms')}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                      >
                        <span>Available</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('maintenanceRooms')}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                      >
                        <span>Maintenance</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={() => handleSort('roomsWithPenalties')}
                        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
                      >
                        <span>Penalties</span>
                        <ArrowUpDown className="w-4 h-4" />
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredAndSortedFacilities.map((facility) => {
                    const stats = facility.id ? facilityStats[facility.id] : null;
                    return (
                      <tr key={facility.id} className="hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{facility.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">{facility.billingEntity}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">{stats?.totalRooms || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-green-400 font-medium">{stats?.occupiedRooms || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-blue-400 font-medium">{stats?.availableRooms || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-orange-400 font-medium">{stats?.maintenanceRooms || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-red-400 font-medium">{stats?.roomsWithPenalties || 0}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {/* Edit/Delete Actions */}
                            {canManageFacilities && (
                              <>
                                <button
                                  onClick={() => handleEdit(facility)}
                                  className="p-1 text-gray-400 hover:text-white transition-colors"
                                  title="Edit Facility"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => facility.id && handleDelete(facility.id)}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Delete Facility"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {/* Navigation Actions - Icons only */}
                            {canManageRooms && (
                              <button
                                onClick={() => navigate(`/rooms?facility=${facility.id}`)}
                                className="p-1 rounded border border-blue-500 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                title="View Rooms"
                              >
                                <DoorClosed className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/leases?facility=${facility.id}`)}
                              className="p-1 rounded border border-green-500 bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                              title="View Leases"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/payments?facility=${facility.id}`)}
                              className="p-1 rounded border border-yellow-500 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                              title="View Payments"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/renters?facility=${facility.id}`)}
                              className="p-1 rounded border border-purple-500 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                              title="View Renters"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>
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
      </div>
    </div>
  );
};

export default Facilities;
