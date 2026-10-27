import { create } from 'zustand';
import {
  TripItem,
  DriverApplicant,
  CreateTripInput,
  TripStatusType,
  BookingItem,
  CreateBookingInput,
  AvailableServiceItem,
  DriverAvailability,
  IncidentItem,
} from '@/types/transport';
import { DriverVerificationStatus } from '@/types/user';
import { listDriversApi, verifyDriverApi, suspendDriverApi, rejectDriverApi } from '@/api/admin';
import {
  cancelTripApi,
  completeTripApi,
  createTripApi,
  listTripsApi,
  startTripApi,
} from '@/api/trips';
import {
  createBookingApi,
  getMyBookingsApi,
  getDriverBookingsApi,
  updateBookingStatusApi,
  cancelBookingApi,
  getAvailableServicesApi,
  setDriverAvailabilityApi,
  getDriverAvailabilityApi,
} from '@/api/bookings';
import {
  createIncidentApi,
  listIncidentsApi,
  rateBookingApi,
  CreateIncidentPayload,
} from '@/api/incidents';
import { offlineCache } from '@/utils/offlineCache';

interface TransportState {
  trips: TripItem[];
  drivers: DriverApplicant[];
  bookings: BookingItem[];
  driverBookings: BookingItem[];
  availableServices: AvailableServiceItem[];
  incidents: IncidentItem[];
  driverAvailability: DriverAvailability;
  activeFilterVehicle: string;
  searchQuery: string;
  isOffline: boolean;

  // Trip actions
  fetchTrips: () => Promise<void>;
  createTrip: (input: CreateTripInput) => Promise<TripItem>;
  removeTrip: (id: string) => Promise<void>;
  updateTripStatus: (id: string, status: TripStatusType) => Promise<void>;

  // Booking actions
  fetchMyBookings: () => Promise<void>;
  fetchDriverBookings: () => Promise<void>;
  createBooking: (input: CreateBookingInput) => Promise<BookingItem>;
  updateBookingStatus: (id: string, status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED') => Promise<void>;
  cancelBooking: (id: string) => Promise<void>;
  rateBooking: (bookingId: string, rating: number, comment?: string) => Promise<void>;

  // Driver on-demand availability
  setDriverAvailability: (status: DriverAvailability) => Promise<void>;
  fetchDriverAvailability: () => Promise<void>;
  fetchAvailableServices: () => Promise<void>;

  // Incidents
  reportIncident: (input: CreateIncidentPayload) => Promise<IncidentItem>;
  fetchIncidents: (status?: string) => Promise<void>;

  // Driver actions (Admin)
  fetchDrivers: () => Promise<void>;
  verifyDriver: (id: string) => Promise<void>;
  rejectDriver: (id: string, reason?: string) => Promise<void>;
  suspendDriver: (id: string) => Promise<void>;

  // UI state
  setActiveFilterVehicle: (vehicle: string) => void;
  setSearchQuery: (query: string) => void;
  setIsOffline: (offline: boolean) => void;
}

export const useTransportStore = create<TransportState>((set, get) => ({
  trips: [],
  drivers: [],
  bookings: [],
  driverBookings: [],
  availableServices: [],
  incidents: [],
  driverAvailability: 'NOT_AVAILABLE',
  activeFilterVehicle: 'ALL',
  searchQuery: '',
  isOffline: false,

  fetchTrips: async () => {
    try {
      const trips = await listTripsApi();
      set({ trips, isOffline: false });
      void offlineCache.saveTrips(trips);
    } catch (error) {
      console.warn('Network issue fetching trips, falling back to offline cache:', error);
      const cached = await offlineCache.getTrips();
      if (cached && cached.length > 0) {
        set({ trips: cached, isOffline: true });
      }
    }
  },

  createTrip: async (input) => {
    const trip = await createTripApi(input);
    set((state) => {
      const updated = [trip, ...state.trips];
      void offlineCache.saveTrips(updated);
      return { trips: updated };
    });
    return trip;
  },

  removeTrip: async (id) => {
    await cancelTripApi(id);
    set((state) => {
      const updated = state.trips.map((trip) =>
        trip.id === id ? { ...trip, status: 'CANCELLED' as TripStatusType } : trip,
      );
      void offlineCache.saveTrips(updated);
      return { trips: updated };
    });
  },

  updateTripStatus: async (id, status) => {
    const updatedTrip =
      status === 'ACTIVE'
        ? await startTripApi(id)
        : status === 'COMPLETED'
          ? await completeTripApi(id)
          : status === 'CANCELLED'
            ? (await cancelTripApi(id), null)
            : null;

    set((state) => {
      const updated = state.trips.map((trip) => {
        if (trip.id !== id) return trip;
        if (updatedTrip) return updatedTrip;
        return { ...trip, status, currentStopIndex: trip.currentStopIndex };
      });
      void offlineCache.saveTrips(updated);
      return { trips: updated };
    });
  },

  fetchMyBookings: async () => {
    try {
      const bookings = await getMyBookingsApi();
      set({ bookings, isOffline: false });
      void offlineCache.saveMyBookings(bookings);
    } catch (error) {
      console.warn('Network issue fetching bookings, falling back to offline cache:', error);
      const cached = await offlineCache.getMyBookings();
      if (cached && cached.length > 0) {
        set({ bookings: cached, isOffline: true });
      }
    }
  },

  fetchDriverBookings: async () => {
    try {
      const driverBookings = await getDriverBookingsApi();
      set({ driverBookings, isOffline: false });
      void offlineCache.saveDriverBookings(driverBookings);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'You are signed out. Please log in again to load driver bookings.'
      ) {
        return;
      }

      console.warn('Network issue fetching driver bookings, falling back to cache:', error);
      const cached = await offlineCache.getDriverBookings();
      if (cached && cached.length > 0) {
        set({ driverBookings: cached, isOffline: true });
      }
    }
  },

  createBooking: async (input) => {
    const booking = await createBookingApi(input);
    set((state) => {
      const updatedBookings = [booking, ...state.bookings];
      const updatedTrips = state.trips.map((t) =>
        input.tripId && t.id === input.tripId && t.availableSeats > 0
          ? { ...t, availableSeats: Math.max(0, t.availableSeats - (input.seatsCount || 1)) }
          : t,
      );
      void offlineCache.saveMyBookings(updatedBookings);
      void offlineCache.saveTrips(updatedTrips);
      return { bookings: updatedBookings, trips: updatedTrips };
    });
    return booking;
  },

  updateBookingStatus: async (id, status) => {
    const updated = await updateBookingStatusApi(id, status);
    set((state) => {
      const updatedDriverBookings = state.driverBookings.map((b) => (b.id === id ? updated : b));
      const updatedBookings = state.bookings.map((b) => (b.id === id ? updated : b));
      void offlineCache.saveDriverBookings(updatedDriverBookings);
      void offlineCache.saveMyBookings(updatedBookings);
      return {
        driverBookings: updatedDriverBookings,
        bookings: updatedBookings,
      };
    });
  },

  cancelBooking: async (id) => {
    await cancelBookingApi(id);
    set((state) => {
      const updatedBookings = state.bookings.map((b) =>
        b.id === id ? { ...b, status: 'CANCELLED' as const } : b,
      );
      const updatedDriverBookings = state.driverBookings.map((b) =>
        b.id === id ? { ...b, status: 'CANCELLED' as const } : b,
      );
      void offlineCache.saveMyBookings(updatedBookings);
      void offlineCache.saveDriverBookings(updatedDriverBookings);
      return {
        bookings: updatedBookings,
        driverBookings: updatedDriverBookings,
      };
    });
  },

  rateBooking: async (bookingId, rating, comment) => {
    await rateBookingApi(bookingId, rating, comment);
    // Refresh available services so new rating reflects
    void get().fetchAvailableServices();
  },

  setDriverAvailability: async (status) => {
    try {
      const result = await setDriverAvailabilityApi(status);
      set({ driverAvailability: result.status });
      const availableServices = await getAvailableServicesApi();
      set({ availableServices });
      void offlineCache.saveAvailableServices(availableServices);
    } catch (error) {
      console.error('Failed to update availability:', error);
      throw error;
    }
  },

  fetchDriverAvailability: async () => {
    try {
      const result = await getDriverAvailabilityApi();
      set({ driverAvailability: result.status });
    } catch (error) {
      console.error('Failed to fetch driver availability:', error);
    }
  },

  fetchAvailableServices: async () => {
    try {
      const availableServices = await getAvailableServicesApi();
      set({ availableServices, isOffline: false });
      void offlineCache.saveAvailableServices(availableServices);
    } catch (error) {
      console.warn('Network issue fetching services, using offline cache:', error);
      const cached = await offlineCache.getAvailableServices();
      if (cached && cached.length > 0) {
        set({ availableServices: cached, isOffline: true });
      }
    }
  },

  reportIncident: async (input) => {
    const result = await createIncidentApi(input);
    set((state) => ({ incidents: [result, ...state.incidents] }));
    return result;
  },

  fetchIncidents: async (status) => {
    try {
      const incidents = await listIncidentsApi(status);
      set({ incidents });
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    }
  },

  fetchDrivers: async () => {
    try {
      const drivers = await listDriversApi();
      set({ drivers });
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  },

  verifyDriver: async (id) => {
    if (!id.trim()) {
      throw new Error('Missing driver user ID. Refresh the driver list and try again.');
    }

    try {
      await verifyDriverApi(id);
      set((state) => ({
        drivers: state.drivers.map((d) =>
          d.userId === id
            ? { ...d, verificationStatus: DriverVerificationStatus.VERIFIED }
            : d,
        ),
      }));
    } catch (error) {
      console.error('Failed to verify driver:', error);
      throw error;
    }
  },

  rejectDriver: async (id, reason) => {
    if (!id.trim()) {
      throw new Error('Missing driver user ID. Refresh the driver list and try again.');
    }

    try {
      await rejectDriverApi(id, reason);
      set((state) => ({
        drivers: state.drivers.map((d) =>
          d.userId === id
            ? { ...d, verificationStatus: DriverVerificationStatus.SUSPENDED }
            : d,
        ),
      }));
    } catch (error) {
      console.error('Failed to reject driver:', error);
      throw error;
    }
  },

  suspendDriver: async (id) => {
    if (!id.trim()) {
      throw new Error('Missing driver user ID. Refresh the driver list and try again.');
    }

    try {
      await suspendDriverApi(id);
      set((state) => ({
        drivers: state.drivers.map((d) =>
          d.userId === id
            ? { ...d, verificationStatus: DriverVerificationStatus.SUSPENDED }
            : d,
        ),
      }));
    } catch (error) {
      console.error('Failed to suspend driver:', error);
      throw error;
    }
  },

  setActiveFilterVehicle: (vehicle) => set({ activeFilterVehicle: vehicle }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsOffline: (offline) => set({ isOffline: offline }),
}));
