import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus, Search, FileText, Calendar, Building2, User, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { inspectionService, type Inspection } from '../../services/inspectionService';
import { leaseService, facilityService, roomService, renterService } from '../../services/firebaseService';
import MobileCard from '../../components/mobile/MobileCard';
import QuickActions from '../../components/mobile/QuickActions';
import BottomSheet from '../../components/mobile/BottomSheet';
import InspectionForm from '../../components/forms/InspectionForm';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

/**
 * MobileInspections - Mobile-optimized inspections page
 * Features:
 * - List of inspections
 * - Quick action to start new inspection with lease selector
 * - View/edit existing inspections
 */
const MobileInspections: React.FC = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [renters, setRenters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pre' | 'post'>('all');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [showLeaseSelector, setShowLeaseSelector] = useState(false);
  const [selectedInspectionType, setSelectedInspectionType] = useState<'pre' | 'post'>('pre');

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setIsLoading(true);
    try {
      // Load all inspections (we'll need to add a getAllInspections method or load by leases)
      const leasesData = await leaseService.getAllLeases();
      setLeases(leasesData);
      
      // Load inspections for each lease
      const inspectionPromises = leasesData.map(lease =>
        lease.id ? inspectionService.getInspectionsByLease(lease.id) : Promise.resolve([])
      );
      const inspectionArrays = await Promise.all(inspectionPromises);
      const allInspections = inspectionArrays.flat();
      setInspections(allInspections);

      // Load related data
      const [facilitiesData, roomsData, rentersData] = await Promise.all([
        facilityService.getFacilities(),
        roomService.getAllRooms(),
        renterService.getAllRenters()
      ]);
      setFacilities(facilitiesData);
      setRooms(roomsData);
      setRenters(rentersData);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInspections = inspections.filter(inspection => {
    if (filterType !== 'all' && inspection.type !== filterType) {
      return false;
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const room = rooms.find(r => r.id === inspection.roomId);
      const roomNumber = room?.roomNumber || '';
      const lease = leases.find(l => l.id === inspection.leaseId);
      const renter = lease ? renters.find(r => r.id === lease.renterId) : null;
      const renterName = renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : '';
      
      if (!roomNumber.toLowerCase().includes(searchLower) && 
          !renterName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  const getLeaseForInspection = (inspection: Inspection) => {
    return leases.find(l => l.id === inspection.leaseId);
  };

  const getRoomNumber = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.roomNumber || 'Unknown';
  };

  const getFacilityName = (facilityId: string) => {
    return facilities.find(f => f.id === facilityId)?.name || 'Unknown';
  };

  const getRenterName = (renterId: string) => {
    const renter = renters.find(r => r.id === renterId);
    return renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown';
  };

  const handleStartInspection = () => {
    // Show lease selector instead of alert
    setShowLeaseSelector(true);
  };

  const handleLeaseSelect = (lease: any, inspectionType: 'pre' | 'post') => {
    setSelectedLease(lease);
    setSelectedInspectionType(inspectionType);
    setShowLeaseSelector(false);
    setShowInspectionForm(true);
  };

  const handleInspectionClick = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    const lease = getLeaseForInspection(inspection);
    if (lease) {
      setSelectedLease(lease);
    }
  };

  // Get active leases for selector
  const activeLeases = leases.filter(lease => lease.status === 'active');

  return (
    <div className="p-4 pt-20 pb-24 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search inspections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Bar - iOS Style Segmented Control */}
      <div className="bg-gray-800/60 rounded-2xl p-1.5 flex items-center shadow-inner">
        <div className="flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          {['all', 'pre', 'post'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as 'all' | 'pre' | 'post')}
              className={`relative flex-1 min-w-[70px] px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 touch-manipulation ${
                filterType === type
                  ? 'text-gray-900 bg-white shadow-md'
                  : 'text-gray-400 active:text-gray-300'
              }`}
            >
              <span className="relative z-10">
                {type === 'all' ? 'All' : type === 'pre' ? 'Pre-Inspection' : 'Post-Inspection'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Inspections List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading inspections...</p>
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2 text-lg font-semibold">No inspections found</p>
          <p className="text-gray-500 text-sm mb-6">
            {searchTerm ? 'Try adjusting your search' : 'Start by creating your first inspection'}
          </p>
          <Button variant="primary" onClick={handleStartInspection} className="px-6 py-3">
            <Plus className="w-5 h-5 mr-2" />
            Start New Inspection
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInspections.map((inspection) => {
            const lease = getLeaseForInspection(inspection);
            const hasIssues = inspection.totalRepairCost > 0;
            
            return (
              <MobileCard
                key={inspection.id}
                onClick={() => handleInspectionClick(inspection)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <ClipboardCheck className={`w-5 h-5 ${
                        inspection.type === 'pre' ? 'text-blue-400' : 'text-purple-400'
                      }`} />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inspection.type === 'pre' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {inspection.type === 'pre' ? 'Pre' : 'Post'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inspection.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {inspection.status === 'completed' ? (
                          <span className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Complete
                          </span>
                        ) : (
                          'Draft'
                        )}
                      </span>
                      {hasIssues && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Issues
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">
                      Room {getRoomNumber(inspection.roomId)}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{getRenterName(inspection.renterId)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span>{getFacilityName(inspection.facilityId)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {inspection.inspectionDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </span>
                      </div>
                      {hasIssues && (
                        <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-gray-700">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 font-semibold">
                            Repair Cost: R{inspection.totalRepairCost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}

      {/* Quick Action FAB */}
      <QuickActions
        mainAction={{
          id: 'start-inspection',
          label: 'Start Inspection',
          icon: Plus,
          onClick: handleStartInspection,
        }}
      />

      {/* Lease Selector Bottom Sheet */}
      {showLeaseSelector && (
        <BottomSheet
          isOpen={true}
          onClose={() => setShowLeaseSelector(false)}
          title="Select Lease for Inspection"
        >
          <div className="p-4 space-y-4">
            {/* Inspection Type Selector */}
            <div className="bg-gray-800/60 rounded-2xl p-1.5 flex items-center shadow-inner mb-4">
              <div className="flex items-center flex-1">
                {(['pre', 'post'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedInspectionType(type)}
                    className={`relative flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 touch-manipulation ${
                      selectedInspectionType === type
                        ? 'text-gray-900 bg-white shadow-md'
                        : 'text-gray-400 active:text-gray-300'
                    }`}
                  >
                    <span className="relative z-10">
                      {type === 'pre' ? 'Pre-Inspection' : 'Post-Inspection'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lease List */}
            {activeLeases.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No active leases found</p>
                <p className="text-gray-500 text-sm">Create a lease first to start an inspection</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {activeLeases.map((lease) => {
                  const room = rooms.find(r => r.id === lease.roomId);
                  const facility = facilities.find(f => f.id === lease.facilityId);
                  const renter = renters.find(r => r.id === lease.renterId);
                  const hasPreInspection = inspections.some(
                    i => i.leaseId === lease.id && i.type === 'pre'
                  );
                  const hasPostInspection = inspections.some(
                    i => i.leaseId === lease.id && i.type === 'post'
                  );

                  return (
                    <button
                      key={lease.id}
                      onClick={() => handleLeaseSelect(lease, selectedInspectionType)}
                      className="w-full text-left p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-primary-500/50 hover:bg-gray-800 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-base mb-1">
                            {room?.roomNumber || 'Unknown Room'}
                          </h3>
                          <div className="space-y-1 text-sm text-gray-400">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4" />
                              <span>{facility?.name || 'Unknown Facility'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4" />
                              <span>
                                {renter ? `${renter.personalInfo.firstName} ${renter.personalInfo.lastName}` : 'Unknown Renter'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {selectedInspectionType === 'pre' && hasPreInspection && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                              Pre Done
                            </span>
                          )}
                          {selectedInspectionType === 'post' && hasPostInspection && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                              Post Done
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* Inspection Form Modal */}
      {showInspectionForm && selectedLease && (
        <InspectionForm
          leaseId={selectedLease.id!}
          facilityId={selectedLease.facilityId}
          roomId={selectedLease.roomId}
          renterId={selectedLease.renterId}
          inspectionType={selectedInspectionType}
          existingInspection={selectedInspection || undefined}
          onSuccess={() => {
            setShowInspectionForm(false);
            setSelectedLease(null);
            setSelectedInspection(null);
            loadInspections();
          }}
          onCancel={() => {
            setShowInspectionForm(false);
            setSelectedLease(null);
            setSelectedInspection(null);
          }}
        />
      )}

      {/* Inspection Details Bottom Sheet */}
      {selectedInspection && selectedLease && !showInspectionForm && (
        <BottomSheet
          isOpen={true}
          onClose={() => {
            setSelectedInspection(null);
            setSelectedLease(null);
          }}
          title={`${selectedInspection.type === 'pre' ? 'Pre' : 'Post'}-Inspection`}
        >
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Room</p>
                <p className="text-white font-medium">{getRoomNumber(selectedInspection.roomId)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Date</p>
                <p className="text-white font-medium">
                  {selectedInspection.inspectionDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className={`text-white font-medium ${
                  selectedInspection.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {selectedInspection.status}
                </p>
              </div>
              {selectedInspection.totalRepairCost > 0 && (
                <div>
                  <p className="text-gray-400 text-sm">Repair Cost</p>
                  <p className="text-yellow-400 font-medium">
                    R{selectedInspection.totalRepairCost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="primary"
              onClick={() => {
                if (selectedLease) {
                  setShowInspectionForm(true);
                }
              }}
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              {selectedInspection ? 'Edit Inspection' : 'View Inspection'}
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

export default MobileInspections;
