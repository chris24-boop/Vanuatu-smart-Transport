import { api } from './client';

export type TouristServiceType =
  | 'AIRPORT_TRANSFER'
  | 'CRUISE_TRANSFER'
  | 'POINT_TO_POINT'
  | 'SIGHTSEEING_TRIP'
  | 'HALF_DAY_TOUR'
  | 'FULL_DAY_TOUR'
  | 'CUSTOM_ITINERARY';

export interface TouristDestination {
  id: string;
  name: string;
  island: string;
  description?: string | null;
}

export interface TouristVehicleService {
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleType: string;
  vehicleName: string;
  passengerCapacity: number;
  luggageCapacity: number | null;
  serviceArea: string;
  languages: string[];
  serviceTypes: TouristServiceType[];
  availableFrom: string | null;
  availableUntil: string | null;
  pricing: string;
}

export interface TouristRequestInput {
  requesterName: string;
  contactEmail?: string;
  contactPhone: string;
  serviceType: TouristServiceType;
  pickupLocation: string;
  travelAt: string;
  passengerCount: number;
  luggageCount: number;
  flightNumber?: string;
  cruiseShipName?: string;
  specialRequests?: string;
  driverId: string;
  vehicleId: string;
  stops: string[];
}

export interface GuestTouristQuote {
  id: string;
  amount: string;
  currency: string;
  durationHours: string;
  includedServices: string[];
  excludedServices: string[];
  waitingTerms?: string | null;
  cancellationTerms?: string | null;
  expiresAt: string;
  driverName?: string;
  vehicleName?: string;
}

export interface GuestTouristRequest {
  reference: string;
  requesterName: string;
  serviceType: TouristServiceType;
  pickupLocation: string;
  travelAt: string;
  passengerCount: number;
  luggageCount: number;
  specialRequests?: string | null;
  status: string;
  stops: string[];
  quotes: GuestTouristQuote[];
  booking: null | {
    status: string;
    startAt: string;
    endAt: string;
    paymentStatus: string;
    paidAmount: string;
  };
}

export interface TouristDriverVehicle {
  id: string;
  vehicleType: string;
  make: string | null;
  model: string | null;
  capacity: number | null;
  touristCapacity: number | null;
  luggageCapacity: number | null;
}

export interface TouristDriverApplication {
  verificationStatus: string;
  profile: null | {
    approved: boolean;
    enabled: boolean;
    serviceArea: string;
    languages: string[];
    serviceTypes: TouristServiceType[];
    pricingDescription: string | null;
    availableFrom: string | null;
    availableUntil: string | null;
    vehicleIds: string[];
  };
  vehicles: TouristDriverVehicle[];
}

export interface TouristDriverRequest {
  id: string;
  requesterName: string;
  contactPhone: string;
  contactEmail: string | null;
  serviceType: TouristServiceType;
  pickupLocation: string;
  travelAt: string;
  passengerCount: number;
  luggageCount: number;
  flightNumber: string | null;
  cruiseShipName: string | null;
  specialRequests: string | null;
  stops: string[];
  status: string;
}

export interface TouristDriverBooking {
  id: string;
  status: string;
  paymentStatus: string;
  paidAmount: string;
  startAt: string;
  endAt: string;
  requesterName: string;
  contactPhone: string;
  pickupLocation: string;
  stops: string[];
  passengerCount: number;
  luggageCount: number;
  amount: string;
  currency: string;
  vehicleName: string;
}

export async function getTouristDriversApi(): Promise<TouristVehicleService[]> {
  const response = await api.get<TouristVehicleService[]>('/tourist/drivers');
  return response.data;
}

export async function getTouristDestinationsApi(): Promise<TouristDestination[]> {
  const response = await api.get<TouristDestination[]>('/tourist/destinations');
  return response.data;
}

export async function getTouristServicesApi(): Promise<
  { type: TouristServiceType; label: string }[]
> {
  const response = await api.get<{ type: TouristServiceType; label: string }[]>(
    '/tourist/services',
  );
  return response.data;
}

export async function createTouristRequestApi(input: TouristRequestInput): Promise<{
  reference: string;
  accessToken: string;
  notice: string;
}> {
  const response = await api.post('/tourist/requests', input);
  return response.data;
}

export async function verifyTouristRequestApi(
  reference: string,
  accessToken: string,
): Promise<GuestTouristRequest> {
  const response = await api.post<GuestTouristRequest>(
    `/tourist/requests/${encodeURIComponent(reference)}/verify`,
    { accessToken },
  );
  return response.data;
}

export async function cancelTouristRequestApi(
  reference: string,
  accessToken: string,
): Promise<{ reference: string; status: string }> {
  const response = await api.post<{ reference: string; status: string }>(
    `/tourist/requests/${encodeURIComponent(reference)}/cancel`,
    { accessToken },
  );
  return response.data;
}

export async function confirmTouristQuoteApi(
  quoteId: string,
  reference: string,
  accessToken: string,
): Promise<{
  id: string;
  reference: string;
  amount: string;
  currency: string;
  startAt: string;
  endAt: string;
  paymentStatus: string;
  paymentNotice: string;
}> {
  const response = await api.post(`/tourist/quotes/${encodeURIComponent(quoteId)}/confirm`, {
    reference,
    accessToken,
  });
  return response.data;
}

export async function getTouristDriverApplicationApi(): Promise<TouristDriverApplication> {
  const response = await api.get<TouristDriverApplication>(
    '/tourist/driver/service-application',
  );
  return response.data;
}

export async function applyForTouristServiceApi(input: {
  serviceArea: string;
  languages: string[];
  vehicleIds: string[];
  vehicleCapacities: {
    vehicleId: string;
    passengerCapacity: number;
    luggageCapacity: number;
  }[];
  serviceTypes: TouristServiceType[];
  pricingDescription: string;
  availableFrom: string;
  availableUntil: string;
}): Promise<TouristDriverApplication['profile']> {
  const response = await api.post<TouristDriverApplication['profile']>(
    '/tourist/driver/service-application',
    input,
  );
  return response.data;
}

export async function getTouristDriverRequestsApi(): Promise<TouristDriverRequest[]> {
  const response = await api.get<TouristDriverRequest[]>('/tourist/driver/requests');
  return response.data;
}

export async function declineTouristRequestApi(requestId: string) {
  const response = await api.post(`/tourist/driver/requests/${encodeURIComponent(requestId)}/decline`);
  return response.data;
}

export async function createTouristQuoteApi(
  requestId: string,
  input: {
    amount: number;
    durationHours: number;
    expiresAt: string;
    includedServices: string[];
    excludedServices: string[];
    waitingTerms?: string;
    cancellationTerms?: string;
  },
) {
  const response = await api.post(
    `/tourist/driver/requests/${encodeURIComponent(requestId)}/quote`,
    input,
  );
  return response.data;
}

export async function getTouristDriverBookingsApi(): Promise<TouristDriverBooking[]> {
  const response = await api.get<TouristDriverBooking[]>('/tourist/driver/bookings');
  return response.data;
}

export async function updateTouristBookingStatusApi(
  bookingId: string,
  status: 'IN_PROGRESS' | 'COMPLETED',
) {
  const response = await api.patch(
    `/tourist/driver/bookings/${encodeURIComponent(bookingId)}/status`,
    { status },
  );
  return response.data;
}

export async function recordTouristCashPaymentApi(
  bookingId: string,
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID',
  paidAmount: number,
) {
  const response = await api.patch(
    `/tourist/driver/bookings/${encodeURIComponent(bookingId)}/cash-payment`,
    { status, paidAmount },
  );
  return response.data;
}

export async function createTouristDestinationApi(input: {
  name: string;
  island: string;
  description?: string;
}) {
  const response = await api.post('/tourist/admin/destinations', input);
  return response.data;
}

export async function getAdminTouristDestinationsApi(): Promise<
  (TouristDestination & { active: boolean })[]
> {
  const response = await api.get<(TouristDestination & { active: boolean })[]>(
    '/tourist/admin/destinations',
  );
  return response.data;
}

export async function updateTouristDestinationApi(
  destination: TouristDestination & { active?: boolean },
) {
  const response = await api.patch(
    `/tourist/admin/destinations/${encodeURIComponent(destination.id)}`,
    {
      name: destination.name,
      island: destination.island,
      description: destination.description,
      active: destination.active,
    },
  );
  return response.data;
}
