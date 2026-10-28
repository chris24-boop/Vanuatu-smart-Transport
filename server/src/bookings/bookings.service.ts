import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { IncidentsService } from '../incidents/incidents.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incidentsService: IncidentsService,
  ) {}

  async createBooking(passengerId: string, input: CreateBookingDto) {
    if (Boolean(input.tripId) === Boolean(input.driverId)) {
      throw new BadRequestException('Provide either a tripId or driverId to create a booking.');
    }

    if (input.driverId) {
      const driver = await this.prisma.user.findUnique({
        where: { id: input.driverId },
        include: { driver: true, vehicles: true },
      });
      const vehicle = driver?.vehicles?.[0];

      if (!driver || driver.role !== 'DRIVER' || !vehicle) {
        throw new NotFoundException('Driver service not found.');
      }
      if (driver.driver?.verificationStatus !== 'VERIFIED') {
        throw new ForbiddenException('This driver is not approved to accept bookings.');
      }
      if (driver.driver?.availability !== 'AVAILABLE') {
        throw new ConflictException('This driver is no longer available.');
      }
      if (vehicle.vehicleType !== 'TAXI' && vehicle.vehicleType !== 'PUBLIC_TRANSPORT') {
        throw new ForbiddenException('Direct bookings are only available for taxi and public transport drivers.');
      }

      const booking = await this.prisma.booking.create({
        data: {
          passengerId,
          driverId: driver.id,
          pickupLocation: input.pickupLocation.trim(),
          dropoffLocation: input.dropoffLocation.trim(),
          status: 'REQUESTED',
          fare: input.fare ?? (vehicle.vehicleType === 'TAXI' ? 300 : 150),
          currency: 'VT',
        },
        include: {
          passenger: true,
          driver: { include: { vehicles: true } },
          trip: { include: { driver: true, vehicle: true, route: true } },
          pickupStop: true,
          dropoffStop: true,
        },
      });

      return this.toBookingResponse(booking, input.cargoNotes);
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: input.tripId! },
      include: {
        route: { include: { stops: true } },
        vehicle: true,
        driver: { include: { driver: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }
    if (trip.vehicle.vehicleType !== 'BUS' && trip.vehicle.vehicleType !== 'MINIBUS') {
      throw new ConflictException('Taxi and public transport bookings must target an available driver directly.');
    }

    if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
      throw new ConflictException('This trip or transport service is no longer active.');
    }

    const seatsToBook = input.seatsCount ?? 1;

    // Ensure pickup and dropoff stops exist on the route
    let pickupStop = trip.route.stops.find(
      (s) => s.name.toLowerCase() === input.pickupLocation.trim().toLowerCase(),
    );
    if (!pickupStop) {
      pickupStop = await this.prisma.stop.create({
        data: {
          routeId: trip.routeId,
          name: input.pickupLocation.trim(),
          latitude: -17.7333,
          longitude: 168.3273,
          sequence: trip.route.stops.length + 1,
        },
      });
    }

    let dropoffStop = trip.route.stops.find(
      (s) => s.name.toLowerCase() === input.dropoffLocation.trim().toLowerCase(),
    );
    if (!dropoffStop) {
      dropoffStop = await this.prisma.stop.create({
        data: {
          routeId: trip.routeId,
          name: input.dropoffLocation.trim(),
          latitude: -17.7333,
          longitude: 168.3273,
          sequence: trip.route.stops.length + 2,
        },
      });
    }

    const calculatedFare = input.fare !== undefined ? input.fare : Number(trip.fare) * seatsToBook;

    const booking = await this.prisma.$transaction(async (tx) => {
      const reservedSeats = await tx.trip.updateMany({
        where: {
          id: trip.id,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          availableSeats: { gte: seatsToBook },
        },
        data: { availableSeats: { decrement: seatsToBook } },
      });

      if (reservedSeats.count !== 1) {
        throw new ConflictException('Not enough seats available on this vehicle.');
      }

      const created = await tx.booking.create({
        data: {
          passengerId,
          driverId: trip.driverId,
          tripId: trip.id,
          pickupStopId: pickupStop!.id,
          dropoffStopId: dropoffStop!.id,
          pickupLocation: input.pickupLocation.trim(),
          dropoffLocation: input.dropoffLocation.trim(),
          status: 'REQUESTED',
          seatsCount: seatsToBook,
          fare: calculatedFare,
          currency: 'VT',
        },
        include: {
          passenger: true,
          driver: { include: { vehicles: true } },
          trip: {
            include: {
              driver: true,
              vehicle: true,
              route: true,
            },
          },
          pickupStop: true,
          dropoffStop: true,
        },
      });

      return created;
    });

    return this.toBookingResponse(booking, input.cargoNotes);
  }

  async getMyBookings(passengerId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { passengerId },
      include: {
        passenger: true,
        driver: { include: { vehicles: true } },
        trip: {
          include: {
            driver: true,
            vehicle: true,
            route: true,
          },
        },
        pickupStop: true,
        dropoffStop: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => this.toBookingResponse(b));
  }

  async getDriverBookings(driverId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { driverId },
      include: {
        passenger: true,
        driver: { include: { vehicles: true } },
        trip: {
          include: {
            driver: true,
            vehicle: true,
            route: true,
          },
        },
        pickupStop: true,
        dropoffStop: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => this.toBookingResponse(b));
  }

  async updateBookingStatus(driverId: string, bookingId: string, status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED') {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.driverId !== driverId) {
      throw new ForbiddenException('You can only update bookings for your own vehicle.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.booking.updateMany({
        where: {
          id: bookingId,
          status: status === 'CONFIRMED'
            ? 'REQUESTED'
            : status === 'CANCELLED'
              ? { in: ['REQUESTED', 'CONFIRMED'] }
              : 'CONFIRMED',
        },
        data: { status },
      });
      if (result.count !== 1) {
        throw new ConflictException('This booking can no longer be updated.');
      }

      if (status === 'CANCELLED' && booking.tripId && booking.trip) {
        await tx.trip.updateMany({
          where: {
            id: booking.tripId,
            availableSeats: { lte: booking.trip.totalSeats - booking.seatsCount },
          },
          data: { availableSeats: { increment: booking.seatsCount } },
        });
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: {
          passenger: true,
          driver: { include: { vehicles: true } },
          trip: {
            include: {
              driver: true,
              vehicle: true,
              route: true,
            },
          },
          pickupStop: true,
          dropoffStop: true,
        },
      });
    });

    return this.toBookingResponse(updated);
  }

  async cancelBooking(passengerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found.');
    }

    if (booking.passengerId !== passengerId) {
      throw new ForbiddenException('You can only cancel your own bookings.');
    }

    if (!['REQUESTED', 'CONFIRMED'].includes(booking.status)) {
      throw new ConflictException('This booking can no longer be cancelled.');
    }

    await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.updateMany({
        where: {
          id: bookingId,
          passengerId,
          status: { in: ['REQUESTED', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED' },
      });
      if (cancelled.count !== 1) {
        throw new ConflictException('This booking can no longer be cancelled.');
      }
      if (booking.tripId && booking.trip) {
        await tx.trip.updateMany({
          where: {
            id: booking.tripId,
            availableSeats: { lte: booking.trip.totalSeats - booking.seatsCount },
          },
          data: { availableSeats: { increment: booking.seatsCount } },
        });
      }
    });

    return { success: true, message: 'Booking cancelled.' };
  }

  async getDriverAvailability(driverId: string) {
    const driverUser = await this.prisma.user.findUnique({
      where: { id: driverId },
      include: { driver: true, vehicles: true },
    });

    if (!driverUser || driverUser.role !== 'DRIVER' || !driverUser.driver) {
      throw new ForbiddenException('Only drivers can view transport service availability.');
    }

    return {
      status: driverUser.driver.availability,
      vehicleType: driverUser.vehicles?.[0]?.vehicleType || 'BUS',
    };
  }

  async setDriverAvailability(
    driverId: string,
    status: 'AVAILABLE' | 'ON_TRIP' | 'NOT_AVAILABLE',
  ) {
    if (!['AVAILABLE', 'ON_TRIP', 'NOT_AVAILABLE'].includes(status)) {
      throw new BadRequestException('Choose Available, On a Trip, or Not Available.');
    }

    const driverUser = await this.prisma.user.findUnique({
      where: { id: driverId },
      include: { driver: true, vehicles: true },
    });

    if (!driverUser || driverUser.role !== 'DRIVER' || !driverUser.driver) {
      throw new ForbiddenException('Only drivers can update transport service availability.');
    }
    if (driverUser.driver.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenException('Your driver account must be approved before changing availability.');
    }

    const vehicle = driverUser.vehicles?.[0];
    if (!vehicle || (vehicle.vehicleType !== 'TAXI' && vehicle.vehicleType !== 'PUBLIC_TRANSPORT')) {
      throw new ForbiddenException('Availability status is only for taxi and public transport drivers.');
    }

    const updatedDriver = await this.prisma.driver.update({
      where: { userId: driverId },
      data: { availability: status },
    });
    await this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { status: status === 'NOT_AVAILABLE' ? 'INACTIVE' : 'ACTIVE' },
    });

    return {
      status: updatedDriver.availability,
      vehicleType: vehicle.vehicleType,
      message: `Your status is now ${status.replace('_', ' ')}.`,
    };
  }

  async getAvailableServices() {
    const drivers = await this.prisma.user.findMany({
      where: {
        role: 'DRIVER',
        driver: { is: { availability: 'AVAILABLE', verificationStatus: 'VERIFIED' } },
        vehicles: { some: { vehicleType: { in: ['TAXI', 'PUBLIC_TRANSPORT'] } } },
      },
      include: { driver: true, vehicles: true },
      orderBy: { createdAt: 'desc' },
    });

    const services = await Promise.all(
      drivers.map(async (driver) => {
        const vehicle = driver.vehicles[0];
        if (!vehicle) return null;

        const ratingInfo = await this.incidentsService.getDriverRating(driver.id);

        return {
          id: String(driver.id),
          driverId: String(driver.id),
          driverName: `${driver.firstName} ${driver.lastName}`.trim(),
          driverPhone: driver.phone,
          driverVerified: driver.driver?.verificationStatus === 'VERIFIED',
          driverRating: ratingInfo.averageRating,
          totalRatings: ratingInfo.totalRatings,
          vehicleType: vehicle.vehicleType,
          vehiclePlate: vehicle.registrationNumber,
          vehicleModel: vehicle.model || 'Standard',
          fare: vehicle.vehicleType === 'TAXI' ? 300 : 150,
          currency: 'VT',
          availability: driver.driver?.availability || 'NOT_AVAILABLE',
        };
      }),
    );

    return services.filter((s): s is NonNullable<typeof s> => s !== null);
  }

  async rateBooking(passengerId: string, bookingId: string, rating: number, comment?: string) {
    return this.incidentsService.rateDriver(passengerId, bookingId, rating, comment);
  }

  async updateDriverLocation(driverId: string, latitude: number, longitude: number) {
    if (
      !driverId ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new BadRequestException('A valid driver id, latitude, and longitude are required.');
    }

    const activeTrip = await this.prisma.trip.findFirst({
      where: {
        driverId,
        status: 'ACTIVE',
        driver: { driver: { is: { verificationStatus: 'VERIFIED' } } },
      },
    });

    if (!activeTrip) {
      return { success: false, message: 'No active trip found for this driver.' };
    }

    await this.prisma.trip.update({
      where: { id: activeTrip.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
      },
    });

    return {
      success: true,
      tripId: activeTrip.id,
      latitude,
      longitude,
    };
  }

  private toBookingResponse(booking: any, fallbackNotes?: string) {
    const driver = booking.driver ?? booking.trip?.driver;
    const vehicle = booking.trip?.vehicle ?? driver?.vehicles?.[0];
    const storedVehicleType = vehicle?.vehicleType || 'BUS';
    const vehicleType = storedVehicleType === 'CAR'
      ? 'PUBLIC_TRANSPORT'
      : storedVehicleType === 'MINIBUS'
        ? 'BUS'
        : storedVehicleType;

    return {
      id: String(booking.id),
      passengerId: String(booking.passengerId),
      passengerName: booking.passenger ? `${booking.passenger.firstName} ${booking.passenger.lastName}`.trim() : 'Passenger',
      passengerPhone: booking.passenger?.phone || '',
      tripId: booking.tripId ? String(booking.tripId) : null,
      driverId: String(booking.driverId),
      driverName: driver ? `${driver.firstName} ${driver.lastName}`.trim() : 'Driver',
      driverPhone: driver?.phone || '',
      vehicleType,
      vehiclePlate: vehicle?.registrationNumber || 'Pending',
      vehicleModel: vehicle?.model || 'Standard',
      pickupLocation: booking.pickupLocation || booking.pickupStop?.name || 'Pickup',
      dropoffLocation: booking.dropoffLocation || booking.dropoffStop?.name || 'Dropoff',
      status: booking.status,
      fare: Number(booking.fare || booking.trip?.fare || 150),
      currency: booking.currency || 'VT',
      cargoNotes: fallbackNotes || booking.trip?.notes || undefined,
      createdAt: new Date(booking.createdAt).toISOString(),
    };
  }
}
