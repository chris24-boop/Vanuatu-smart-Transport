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
  driverAvailability?: 'AVAILABLE' | 'ON_TRIP' | 'NOT_AVAILABLE';
  licenceNumber?: string | null;
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
