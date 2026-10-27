import { UserRole, DriverVerificationStatus } from './user';

export type VehicleCategory = 'BUS' | 'MINIBUS' | 'TAXI' | 'PUBLIC_TRANSPORT';

export type DriverAvailability = 'AVAILABLE' | 'ON_TRIP' | 'NOT_AVAILABLE';

export type TripStatusType = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type BookingStatusType = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface RouteStop {
  id: string;
  name: string;
  sequence: number;
  estimatedMinutesFromStart: number;
  passed?: boolean;
}

export interface TripItem {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverRating?: number;
  driverVerified: boolean;
  vehicleType: VehicleCategory;
  vehiclePlate: string;
  vehicleModel?: string;
  origin: string;
  destination: string;
  departureTime: string; // e.g. "08:30 AM" or ISO string
  arrivalTime: string;   // e.g. "09:05 AM"
  durationMinutes: number;
  fare: number;
  currency: string;
  totalSeats: number;
  availableSeats: number;
  status: TripStatusType;
  notes?: string;
  stops: RouteStop[];
  currentStopIndex?: number;
  createdAt: string;
}

export interface DriverApplicant {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  licenceNumber: string;
  licenceExpiry: string;
  vehicleType: VehicleCategory;
  vehiclePlate: string;
  vehicleModel: string;
  island: string;
  yearsExperience: number;
  verificationStatus: DriverVerificationStatus;
  appliedDate: string;
}

export interface CreateTripInput {
  origin: string;
  destination: string;
  vehiclePlate: string;
  departureTime: string;
  durationMinutes: number;
  fare: number;
  totalSeats: number;
  stops?: string[];
  notes?: string;
}

export interface BookingItem {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  tripId: string | null;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehicleType: VehicleCategory;
  vehiclePlate: string;
  vehicleModel?: string;
  pickupLocation: string;
  dropoffLocation: string;
  status: BookingStatusType;
  fare: number;
  currency: string;
  cargoNotes?: string;
  createdAt: string;
}

export interface CreateBookingInput {
  tripId?: string;
  driverId?: string;
  pickupLocation: string;
  dropoffLocation: string;
  seatsCount?: number;
  cargoNotes?: string;
  fare?: number;
}

export interface AvailableServiceItem {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverVerified: boolean;
  driverRating?: number;
  totalRatings?: number;
  vehicleType: VehicleCategory;
  vehiclePlate: string;
  vehicleModel: string;
  fare: number;
  currency: string;
  availability: DriverAvailability;
  notes?: string;
}

export interface IncidentItem {
  id: string;
  reporterId: string;
  tripId?: string;
  category: string;
  description: string;
  vehiclePlate: string;
  driverName: string;
  location: string;
  reporterPhone: string;
  status: string;
  createdAt: string;
}

