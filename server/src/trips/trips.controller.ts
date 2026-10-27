import {
  ConflictException,
  ForbiddenException,
  Headers,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Get()
  async listTrips() {
    const trips = await this.prisma.trip.findMany({
      where: { vehicle: { vehicleType: { in: ['BUS', 'MINIBUS'] } } },
      include: {
        route: true,
        driver: { include: { driver: true } },
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return trips.map((trip) => this.toTripResponse(trip));
  }

  @Post()
  async createTrip(
    @Headers('authorization') authorization: string | undefined,
    @Body() input: CreateTripDto,
  ) {
    const driver = await this.getVerifiedDriver(authorization);

    const trip = await this.prisma.$transaction(async (transaction) => {
      const existingVehicle = await transaction.vehicle.findUnique({
        where: { registrationNumber: input.vehiclePlate.trim() },
      });

      if (existingVehicle && existingVehicle.ownerId !== driver.id) {
        throw new ConflictException('This vehicle plate is already registered to another account.');
      }
      if (existingVehicle && existingVehicle.vehicleType !== 'BUS' && existingVehicle.vehicleType !== 'MINIBUS') {
        throw new ForbiddenException('A scheduled bus trip must use your registered bus vehicle.');
      }

      const mappedVehicleType = 'BUS';
      const vehicleModel = 'Public Bus';

      const vehicle = existingVehicle
        ? await transaction.vehicle.update({
            where: { id: existingVehicle.id },
            data: {
              vehicleType: mappedVehicleType,
              model: vehicleModel,
              capacity: input.totalSeats,
              status: 'ACTIVE',
            },
          })
        : await transaction.vehicle.create({
            data: {
              ownerId: driver.id,
              registrationNumber: input.vehiclePlate.trim(),
              vehicleType: mappedVehicleType,
              model: vehicleModel,
              capacity: input.totalSeats,
            },
          });

      const route = await transaction.route.create({
        data: {
          name: `${input.origin.trim()} to ${input.destination.trim()}`,
          origin: input.origin.trim(),
          destination: input.destination.trim(),
          description: input.notes?.trim() || null,
        },
      });

      // Create persistent stops for route so bookings can link to pickup and dropoff stops
      const stopList = input.stops && input.stops.length > 0
        ? input.stops.map((s) => s.trim())
        : [input.origin.trim(), input.destination.trim()];

      for (let i = 0; i < stopList.length; i++) {
        await transaction.stop.create({
          data: {
            routeId: route.id,
            name: stopList[i],
            latitude: -17.7333,
            longitude: 168.3273,
            sequence: i + 1,
          },
        });
      }

      return transaction.trip.create({
        data: {
          routeId: route.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          departureTime: input.departureTime.trim(),
          durationMinutes: input.durationMinutes,
          fare: input.fare,
          currency: 'VT',
          totalSeats: input.totalSeats,
          availableSeats: input.totalSeats,
          stopNames: stopList,
          notes: input.notes?.trim() || null,
        },
        include: {
          route: true,
          driver: { include: { driver: true } },
          vehicle: true,
        },
      });
    });

    return this.toTripResponse(trip);
  }

  @Patch(':id/start')
  async startTrip(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const driver = await this.getVerifiedDriver(authorization);
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: { vehicle: true } });

    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }
    if (trip.driverId !== driver.id) {
      throw new ForbiddenException('You can only start your own trips.');
    }
    if (trip.vehicle.vehicleType !== 'BUS' && trip.vehicle.vehicleType !== 'MINIBUS') {
      throw new ForbiddenException('Only registered bus trips can be started.');
    }
    if (trip.status !== 'PLANNED') {
      throw new ConflictException('Only a planned trip can be started.');
    }

    const activeTrip = await this.prisma.trip.findFirst({
      where: { driverId: driver.id, status: 'ACTIVE' },
    });
    if (activeTrip) {
      throw new ConflictException('Complete your active trip before starting another one.');
    }

    const updatedTrip = await this.prisma.trip.update({
      where: { id },
      data: { status: 'ACTIVE', startTime: new Date() },
      include: {
        route: true,
        driver: { include: { driver: true } },
        vehicle: true,
      },
    });

    return this.toTripResponse(updatedTrip);
  }

  @Patch(':id/complete')
  async completeTrip(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const driver = await this.getVerifiedDriver(authorization);
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: { vehicle: true } });

    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }
    if (trip.driverId !== driver.id) {
      throw new ForbiddenException('You can only complete your own trips.');
    }
    if (trip.vehicle.vehicleType !== 'BUS' && trip.vehicle.vehicleType !== 'MINIBUS') {
      throw new ForbiddenException('Only registered bus trips can be completed.');
    }
    if (trip.status !== 'ACTIVE') {
      throw new ConflictException('Only an active trip can be completed.');
    }

    const updatedTrip = await this.prisma.trip.update({
      where: { id },
      data: { status: 'COMPLETED', endTime: new Date() },
      include: {
        route: true,
        driver: { include: { driver: true } },
        vehicle: true,
      },
    });

    return this.toTripResponse(updatedTrip);
  }

  @Delete(':id')
  async cancelTrip(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const identity = await this.getIdentity(authorization);
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: { vehicle: true } });

    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }
    if (identity.role !== 'ADMIN' && (identity.role !== 'DRIVER' || trip.driverId !== identity.sub)) {
      throw new ForbiddenException('You cannot cancel this trip.');
    }
    if (identity.role === 'DRIVER' && trip.vehicle.vehicleType !== 'BUS' && trip.vehicle.vehicleType !== 'MINIBUS') {
      throw new ForbiddenException('Only your registered bus trips can be cancelled.');
    }
    if (trip.status === 'ACTIVE') {
      throw new ConflictException('Complete the active trip before cancelling it.');
    }
    if (trip.status === 'COMPLETED') {
      throw new ConflictException('A completed trip cannot be cancelled.');
    }

    await this.prisma.trip.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  }

  private async getVerifiedDriver(authorization: string | undefined) {
    const identity = await this.getIdentity(authorization);
    if (identity.role !== 'DRIVER') {
      throw new ForbiddenException('Only a driver can manage driver trips.');
    }

    const driver = await this.prisma.user.findUnique({
      where: { id: identity.sub },
      include: { driver: true, vehicles: true },
    });

    if (!driver || driver.role !== 'DRIVER' || !driver.driver) {
      throw new UnauthorizedException('Driver account not found.');
    }
    if (driver.driver.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenException('Your driver account must be approved before managing trips.');
    }
    if (!driver.vehicles.some((vehicle) => vehicle.vehicleType === 'BUS' || vehicle.vehicleType === 'MINIBUS')) {
      throw new ForbiddenException('Only bus drivers can create or manage scheduled trips.');
    }

    return driver;
  }

  private async getIdentity(authorization: string | undefined) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication is required.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        authorization.slice('Bearer '.length),
      );
      if (!payload.sub || !payload.role) {
        throw new UnauthorizedException('Invalid authentication token.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }

  private toTripResponse(trip: any) {
    const stopNames: string[] = trip.stopNames ?? [trip.route.origin, trip.route.destination];
    const durationMinutes = Number(trip.durationMinutes);

    const vehicleTypeDisplay = trip.vehicle?.vehicleType === 'CAR' || trip.vehicle?.model?.toLowerCase().includes('camion')
      ? 'PUBLIC_TRANSPORT'
      : trip.vehicle.vehicleType === 'MINIBUS'
        ? 'BUS'
        : trip.vehicle.vehicleType;

    return {
      id: String(trip.id),
      driverId: String(trip.driverId),
      driverName: `${trip.driver.firstName} ${trip.driver.lastName}`.trim(),
      driverPhone: trip.driver.phone,
      driverVerified: trip.driver.driver?.verificationStatus === 'VERIFIED',
      vehicleType: vehicleTypeDisplay,
      vehiclePlate: trip.vehicle.registrationNumber,
      vehicleModel: [trip.vehicle.make, trip.vehicle.model].filter(Boolean).join(' ') || trip.vehicle.vehicleType,
      origin: trip.route.origin,
      destination: trip.route.destination,
      departureTime: trip.departureTime,
      arrivalTime: `${durationMinutes} min after departure`,
      durationMinutes,
      fare: Number(trip.fare),
      currency: trip.currency,
      totalSeats: trip.totalSeats,
      availableSeats: trip.availableSeats,
      status: trip.status,
      notes: trip.notes ?? undefined,
      stops: stopNames.map((name, index) => ({
        id: `${trip.id}-stop-${index + 1}`,
        name,
        sequence: index + 1,
        estimatedMinutesFromStart: Math.round((index / (stopNames.length - 1 || 1)) * durationMinutes),
        passed: trip.status === 'ACTIVE' && index === 0,
      })),
      currentStopIndex: trip.status === 'ACTIVE' ? 1 : 0,
      createdAt: new Date(trip.createdAt).toISOString(),
    };
  }
}
