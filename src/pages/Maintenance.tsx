import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Filter, 
  Search, 
  Calendar, 
  Building2, 
  DoorClosed, 
  DollarSign,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Users
} from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  facilityService, 
  roomService, 
  maintenanceExpenseService
} from '../services/firebaseService';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import MaintenanceExpenseForm from '../components/forms/MaintenanceExpenseForm';
import { Timestamp } from 'firebase/firestore';

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

const Maintenance: React.FC = () => {
  const { currentRole, isSystemAdmin } = useRole();
  const { allowStandardUserRooms } = useSettings();
  
  // State
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [maintenanceExpenses, setMaintenanceExpenses] = useState<MaintenanceExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [filterFacility, setFilterFacility] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Modal states
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MaintenanceExpense | null>(null);

  // Check permissions
  const canManageMaintenance = isSystemAdmin || (currentRole === 'standard_user' && allowStandardUserRooms);

  // Load all data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [facilitiesData] = await Promise.all([
        facilityService.getFacilities()
      ]);

      setFacilities(facilitiesData);

      // Load rooms for all facilities
      const roomsPromises = facilitiesData.map(facility => 
        roomService.getRooms(facility.id)
      );
      const roomsArrays = await Promise.all(roomsPromises);
      const allRooms = roomsArrays.flat();
      setRooms(allRooms);

      // Load maintenance expenses
      await loadMaintenanceExpenses(facilitiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMaintenanceExpenses = async (facilitiesData: Facility[]) => {
    try {
      const allExpenses: MaintenanceExpense[] = [];
      
      for (const facility of facilitiesData) {
        try {
          const expenses = await maintenanceExpenseService.getMaintenanceExpensesByFacility(facility.id);
          allExpenses.push(...expenses);
        } catch (error) {
          console.error(`Error loading maintenance expenses for facility ${facility.id}:`, error);
        }
      }
      
      setMaintenanceExpenses(allExpenses);
    } catch (error) {
      console.error('Error loading maintenance expenses:', error);
    }
  };

  // Filter expenses
  const filteredExpenses = maintenanceExpenses.filter(expense => {
    if (filterFacility && expense.facilityId !== filterFacility) return false;
    if (filterStatus && expense.status !== filterStatus) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return expense.description.toLowerCase().includes(searchLower);
    }
    
    if (dateFrom || dateTo) {
      const expenseDate = expense.expenseDate.toDate ? 
        expense.expenseDate.toDate() : 
        new Date(expense.expenseDate);
      
      if (dateFrom && expenseDate < new Date(dateFrom)) return false;
      if (dateTo && expenseDate > new Date(dateTo)) return false;
    }
    
    return true;
  });

  // Get facility name by ID
  const getFacilityName = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    return facility?.name || 'Unknown Facility';
  };

  // Get room numbers by IDs
  const getRoomNumbers = (roomIds: string[]) => {
    return roomIds.map(roomId => {
      const room = rooms.find(r => r.id === roomId);
      return room?.roomNumber || 'Unknown Room';
    }).join(', ');
  };

  // Statistics
  const totalExpenses = filteredExpenses.length;
  const pendingExpenses = filteredExpenses.filter(e => e.status === 'pending').length;
  const completedExpenses = filteredExpenses.filter(e => e.status === 'completed').length;
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
  const recoverableAmount = filteredExpenses.reduce((sum, e) => {
    return sum + e.roomCosts.filter(rc => rc.recoverFromDeposit).reduce((roomSum, rc) => roomSum + rc.amount, 0);
  }, 0);

  // Handlers
  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowExpenseForm(true);
  };

  const handleEditExpense = (expense: MaintenanceExpense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this maintenance expense?')) {
      return;
    }

    try {
      await maintenanceExpenseService.deleteMaintenanceExpense(expenseId);
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error deleting maintenance expense:', error);
      alert('Failed to delete maintenance expense. Please try again.');
    }
  };

  const handleExpenseSuccess = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
    loadData(); // Reload all data
  };

  const handleExpenseCancel = () => {
    setShowExpenseForm(false);
    setEditingExpense(null);
  };

  const clearFilters = () => {
    setFilterFacility('');
    setFilterStatus('');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      return date.toDate ? date.toDate().toLocaleDateString() : new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading maintenance data...</p>
        </div>
      </div>
    );
  }

  if (!canManageMaintenance) {
    return (
      <div className="min-h-screen bg-secondary-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-8 text-center">
            <Wrench className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-yellow-500 mb-2">Access Restricted</h2>
            <p className="text-gray-400">
              You don't have permission to manage maintenance expenses. Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white">Maintenance</h1>
            </div>
            <Button onClick={handleAddExpense}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
          <p className="text-gray-400 text-lg">
            Track maintenance expenses, split costs across rooms, and manage recovery from deposits
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Expenses</p>
                <p className="text-white text-xl font-semibold">{totalExpenses}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-white text-xl font-semibold">{pendingExpenses}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-white text-xl font-semibold">{completedExpenses}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Amount</p>
                <p className="text-white text-xl font-semibold">R{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Recoverable</p>
                <p className="text-white text-xl font-semibold">R{recoverableAmount.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Filter className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-white">Filters</h2>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Facility Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Facility</label>
              <select
                value={filterFacility}
                onChange={(e) => setFilterFacility(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Facilities</option>
                {facilities.map(facility => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Start date"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="End date"
              />
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search maintenance descriptions..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Maintenance Expenses List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Maintenance Expenses ({filteredExpenses.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Maintenance Expenses Found</h3>
              <p className="text-gray-400 mb-6">
                {maintenanceExpenses.length === 0 
                  ? 'No maintenance expenses have been recorded yet.'
                  : 'No expenses match your current filters.'
                }
              </p>
              <Button onClick={handleAddExpense}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Expense
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExpenses.map((expense) => (
                <Card key={expense.id} className="p-6 hover:bg-gray-700 transition-colors">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {expense.description}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {getFacilityName(expense.facilityId)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(expense.status)}`}>
                        {expense.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Amount and Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Total Amount</p>
                        <p className="text-white font-semibold">R{expense.totalAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Date</p>
                        <p className="text-white font-semibold">{formatDate(expense.expenseDate)}</p>
                      </div>
                    </div>

                    {/* Rooms */}
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Rooms</p>
                      <p className="text-white text-sm">{getRoomNumbers(expense.roomIds)}</p>
                    </div>

                    {/* Cost Split and Recovery */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Split Type</p>
                        <p className="text-white capitalize">{expense.costSplitType}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Recoverable</p>
                        <p className="text-white">
                          R{expense.roomCosts.filter(rc => rc.recoverFromDeposit).reduce((sum, rc) => sum + rc.amount, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2 pt-2 border-t border-gray-700">
                      <Button variant="ghost" size="sm" onClick={() => handleEditExpense(expense)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditExpense(expense)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteExpense(expense.id!)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Maintenance Expense Form Modal */}
        {showExpenseForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <MaintenanceExpenseForm
                expense={editingExpense}
                facilities={facilities}
                rooms={rooms}
                onSuccess={handleExpenseSuccess}
                onCancel={handleExpenseCancel}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Maintenance;
