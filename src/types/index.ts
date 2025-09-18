// Core types for the Rental Management System

export interface Facility {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  settings: {
    lateFeeAmount: number; // R20
    lateFeeStartDay: number; // 4th of month
    childSurcharge: number; // R10
    gracePeriodDays: number;
    paymentMethods: string[];
  };
  primaryColor: string;
  billingEntity?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  facilityId: string;
  roomNumber: string;
  type: 'single' | 'double' | 'family' | 'studio';
  capacity: number;
  monthlyRent: number;
  depositAmount: number;
  amenities: string[];
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  facilityId: string;
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
  documents: {
    idCopy?: string;
    proofOfIncome?: string;
    references?: string[];
  };
  status: 'active' | 'inactive' | 'blacklisted';
  createdAt: Date;
  updatedAt: Date;
}

export interface Rental {
  id: string;
  facilityId: string;
  roomId: string;
  tenantId: string;
  startDate: Date;
  endDate?: Date;
  monthlyRent: number;
  depositAmount: number;
  children: number;
  status: 'active' | 'terminated' | 'expired';
  terms: {
    leaseType: 'monthly' | 'fixed-term';
    renewalTerms: string;
    terminationNotice: number; // days
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  facilityId: string;
  rentalId: string;
  tenantId: string;
  month: string; // YYYY-MM format
  amount: number;
  method: 'cash' | 'eft' | 'mobile' | 'card';
  otherFees: number;
  lateFee: number;
  total: number;
  status: 'posted' | 'proposed' | 'partial';
  receiptNumber: string;
  notes?: string;
  createdBy: string; // userId
  approvedBy?: string; // userId
  createdAt: Date;
  updatedAt: Date;
}

export interface Proposal {
  id: string;
  facilityId: string;
  type: 'payment' | 'rental' | 'refund' | 'penalty';
  entityId: string; // ID of the record being modified
  changes: Record<string, any>; // Field changes
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  reviewedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Complaint {
  id: string;
  facilityId: string;
  rentalId: string;
  tenantId: string;
  type: 'maintenance' | 'noise' | 'damage' | 'other';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string; // userId
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Penalty {
  id: string;
  facilityId: string;
  rentalId: string;
  tenantId: string;
  type: 'late' | 'noise' | 'damage' | 'other';
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'paid' | 'waived';
  complaintId?: string; // Link to complaint if applicable
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  facilityId: string;
  rentalId: string;
  tenantId: string;
  originalDeposit: number;
  deductions: {
    damages: number;
    cleaning: number;
    unpaidRent: number;
    other: number;
  };
  refundAmount: number;
  status: 'pending' | 'approved' | 'paid';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  role: 'super-admin' | 'facility-admin' | 'standard-user' | 'read-only';
  facilities: string[]; // Array of facility IDs
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// UI Component Props
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface PaymentFormData {
  roomId: string;
  tenantId: string;
  month: string;
  amount: number;
  method: 'cash' | 'eft' | 'mobile' | 'card';
  otherFees: number;
  notes?: string;
}

export interface RentalFormData {
  roomId: string;
  tenantId: string;
  startDate: Date;
  monthlyRent: number;
  depositAmount: number;
  children: number;
  leaseType: 'monthly' | 'fixed-term';
  terms: string;
}
