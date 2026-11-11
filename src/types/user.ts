export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  OPERATOR = 'OPERATOR',
  ADMIN = 'ADMIN',
  INSPECTOR = 'INSPECTOR',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum DriverVerificationStatus {
  REGISTERED = 'REGISTERED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  driverVerificationStatus?: DriverVerificationStatus | null;
  driverRejectionReason?: string | null;
  driverAvailability?: 'AVAILABLE' | 'ON_TRIP' | 'NOT_AVAILABLE';
  licenceNumber?: string | null;
  licenceExpiry?: string | null;
  yearsExperience?: number | null;
  driverDocuments?: Array<{
    id: string;
    type: 'LICENCE' | 'VEHICLE_REGISTRATION' | 'INSURANCE';
    filename: string;
    mimeType: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewReason: string | null;
    reviewedAt: string | null;
    createdAt: string;
  }>;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  vehicleModel?: string | null;
  island?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Driver {
  id: string;
  userId: string;
  licenceNumber: string;
  licenceExpiry: string;
  verificationStatus: DriverVerificationStatus;
  createdAt: string;
  updatedAt: string;
}
