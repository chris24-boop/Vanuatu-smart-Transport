import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CashPaymentStatus,
  Prisma,
  TouristRequestStatus,
  TouristServiceType,
} from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { CreateTouristQuoteDto } from './dto/create-tourist-quote.dto';
import { CreateTouristRequestDto } from './dto/create-tourist-request.dto';
import { DriverTouristApplicationDto } from './dto/driver-tourist-application.dto';

const TOUR_SERVICES = [
  { type: TouristServiceType.AIRPORT_TRANSFER, label: 'Airport transfer' },
  { type: TouristServiceType.CRUISE_TRANSFER, label: 'Cruise-terminal transfer' },
  { type: TouristServiceType.POINT_TO_POINT, label: 'Point-to-point transport' },
  { type: TouristServiceType.SIGHTSEEING_TRIP, label: 'Sightseeing trip' },
  { type: TouristServiceType.HALF_DAY_TOUR, label: 'Half-day private tour' },
  { type: TouristServiceType.FULL_DAY_TOUR, label: 'Full-day private tour' },
  { type: TouristServiceType.CUSTOM_ITINERARY, label: 'Custom multi-stop itinerary' },
];

const TOUR_TYPES = new Set<TouristServiceType>([
  TouristServiceType.SIGHTSEEING_TRIP,
  TouristServiceType.HALF_DAY_TOUR,
  TouristServiceType.FULL_DAY_TOUR,
  TouristServiceType.CUSTOM_ITINERARY,
]);

@Injectable()
export class TouristService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  listServices() {
    return TOUR_SERVICES;
  }

  async listDestinations() {
    return this.prisma.touristDestination.findMany({
      where: { active: true },
      select: { id: true, name: true, island: true, description: true },
      orderBy: [{ island: 'asc' }, { name: 'asc' }],
    });
  }

  async listAdminDestinations() {
    return this.prisma.touristDestination.findMany({
      select: { id: true, name: true, island: true, description: true, active: true },
      orderBy: [{ island: 'asc' }, { name: 'asc' }],
    });
  }

  async listDrivers() {
    const now = new Date();
    const profiles = await this.prisma.touristServiceProfile.findMany({
      where: {
        approved: true,
        enabled: true,
        availableUntil: { gt: now },
        serviceTypes: { isEmpty: false },
        driver: {
          status: 'ACTIVE',
          role: 'DRIVER',
          driver: { verificationStatus: 'VERIFIED' },
        },
        vehicles: { some: { status: 'ACTIVE' } },
      },
      select: {
        id: true,
        createdAt: true,
        serviceArea: true,
        languages: true,
        serviceTypes: true,
        pricingDescription: true,
        availableFrom: true,
        availableUntil: true,
        driver: { select: { id: true, firstName: true, lastName: true } },
        vehicles: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            vehicleType: true,
            make: true,
            model: true,
            capacity: true,
            touristCapacity: true,
            luggageCapacity: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return profiles.flatMap((profile) =>
      profile.vehicles.map((vehicle) => ({
        driverId: profile.driver.id,
        driverName: `${profile.driver.firstName} ${profile.driver.lastName}`.trim(),
        vehicleId: vehicle.id,
        vehicleType: vehicle.vehicleType,
        vehicleName: [vehicle.make, vehicle.model].filter(Boolean).join(' ') || vehicle.vehicleType,
        passengerCapacity: vehicle.touristCapacity ?? vehicle.capacity ?? 0,
        luggageCapacity: vehicle.luggageCapacity,
        serviceArea: profile.serviceArea,
        languages: profile.languages,
        serviceTypes: profile.serviceTypes,
        availableFrom: profile.availableFrom?.toISOString() ?? null,
        availableUntil: profile.availableUntil?.toISOString() ?? null,
        pricing: profile.pricingDescription ?? 'Quote required; confirm the final price with the driver.',
      })),
    );
  }

  async getDriver(driverId: string) {
    const drivers = await this.listDrivers();
    const driverServices = drivers.filter((service) => service.driverId === driverId);
    if (driverServices.length === 0) {
      throw new NotFoundException('Published tourist transport service not found.');
    }
    return {
      driver: {
        id: driverServices[0].driverId,
        name: driverServices[0].driverName,
        serviceArea: driverServices[0].serviceArea,
        languages: driverServices[0].languages,
      },
      vehicles: driverServices.map(({ driverId: _driverId, driverName: _name, ...vehicle }) => vehicle),
    };
  }

  async getDriverServiceApplication(driverId: string) {
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: {
        role: true,
        driver: { select: { verificationStatus: true } },
        vehicles: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            vehicleType: true,
            make: true,
            model: true,
            capacity: true,
            touristCapacity: true,
            luggageCapacity: true,
          },
        },
        touristServiceProfile: {
          select: {
            approved: true,
            enabled: true,
            serviceArea: true,
            languages: true,
            serviceTypes: true,
            pricingDescription: true,
            availableFrom: true,
            availableUntil: true,
            vehicles: { select: { id: true } },
          },
        },
      },
    });
    if (!driver || driver.role !== 'DRIVER' || !driver.driver) {
      throw new NotFoundException('Driver account not found.');
    }
    return {
      verificationStatus: driver.driver.verificationStatus,
      profile: driver.touristServiceProfile
        ? {
            approved: driver.touristServiceProfile.approved,
            enabled: driver.touristServiceProfile.enabled,
            serviceArea: driver.touristServiceProfile.serviceArea,
            languages: driver.touristServiceProfile.languages,
            serviceTypes: driver.touristServiceProfile.serviceTypes,
            pricingDescription: driver.touristServiceProfile.pricingDescription,
            availableFrom: driver.touristServiceProfile.availableFrom?.toISOString() ?? null,
            availableUntil: driver.touristServiceProfile.availableUntil?.toISOString() ?? null,
            vehicleIds: driver.touristServiceProfile.vehicles.map((vehicle) => vehicle.id),
          }
        : null,
      vehicles: driver.vehicles,
    };
  }

  async applyForTouristService(
    driverId: string,
    input: DriverTouristApplicationDto,
  ) {
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
      select: {
        role: true,
        driver: { select: { verificationStatus: true } },
        vehicles: { where: { status: 'ACTIVE' }, select: { id: true, capacity: true } },
      },
    });
    if (!driver || driver.role !== 'DRIVER' || !driver.driver) {
      throw new NotFoundException('Driver account not found.');
    }
    if (driver.driver.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenException('Complete driver verification before applying for tourist services.');
    }
    const requestedIds = [...new Set(input.vehicleIds)];
    if (
      requestedIds.length !== input.vehicleIds.length ||
      requestedIds.some((id) => !driver.vehicles.some((vehicle) => vehicle.id === id))
    ) {
      throw new BadRequestException('Select only your active registered vehicles.');
    }
    const availabilityStart = new Date(input.availableFrom);
    const availabilityEnd = new Date(input.availableUntil);
    if (
      !Number.isFinite(availabilityStart.getTime()) ||
      !Number.isFinite(availabilityEnd.getTime()) ||
      availabilityStart <= new Date() ||
      availabilityEnd <= availabilityStart
    ) {
      throw new BadRequestException('Choose a future availability window with an end after its start.');
    }
    const capacityByVehicle = new Map(
      input.vehicleCapacities.map((capacity) => [capacity.vehicleId, capacity]),
    );
    if (
      capacityByVehicle.size !== input.vehicleCapacities.length ||
      input.vehicleCapacities.length !== requestedIds.length ||
      requestedIds.some((id) => {
        const vehicle = driver.vehicles.find((item) => item.id === id);
        const requestedCapacity = capacityByVehicle.get(id);
        return (
          !vehicle ||
          !requestedCapacity ||
          (vehicle.capacity !== null && requestedCapacity.passengerCapacity > vehicle.capacity)
        );
      })
    ) {
      throw new BadRequestException(
        'Provide passenger and luggage capacity for each selected vehicle, without exceeding its registered seats.',
      );
    }

    const profile = await this.prisma.touristServiceProfile.upsert({
      where: { driverId },
      create: {
        driverId,
        approved: true,
        enabled: true,
        serviceArea: input.serviceArea.trim(),
        languages: input.languages.map((language) => language.trim()).filter(Boolean),
        serviceTypes: [...new Set(input.serviceTypes)],
        pricingDescription: input.pricingDescription.trim(),
        availableFrom: availabilityStart,
        availableUntil: availabilityEnd,
      },
      update: {
        approved: true,
        enabled: true,
        serviceArea: input.serviceArea.trim(),
        languages: input.languages.map((language) => language.trim()).filter(Boolean),
        serviceTypes: [...new Set(input.serviceTypes)],
        pricingDescription: input.pricingDescription.trim(),
        availableFrom: availabilityStart,
        availableUntil: availabilityEnd,
      },
    });
    await this.prisma.$transaction([
      this.prisma.vehicle.updateMany({
        where: { ownerId: driverId, touristServiceProfileId: profile.id },
        data: { touristServiceProfileId: null },
      }),
      this.prisma.vehicle.updateMany({
        where: { ownerId: driverId, id: { in: requestedIds }, status: 'ACTIVE' },
        data: { touristServiceProfileId: profile.id },
      }),
      ...input.vehicleCapacities.map((capacity) =>
        this.prisma.vehicle.update({
          where: { id: capacity.vehicleId },
          data: {
            touristCapacity: capacity.passengerCapacity,
            luggageCapacity: capacity.luggageCapacity,
          },
        }),
      ),
    ]);
    return {
      approved: profile.approved,
      enabled: profile.enabled,
      serviceArea: profile.serviceArea,
      languages: profile.languages,
      serviceTypes: profile.serviceTypes,
      pricingDescription: profile.pricingDescription,
      availableFrom: profile.availableFrom?.toISOString() ?? null,
      availableUntil: profile.availableUntil?.toISOString() ?? null,
      vehicleIds: requestedIds,
    };
  }

  async createRequest(input: CreateTouristRequestDto, requesterId?: string) {
    const travelAt = new Date(input.travelAt);
    if (!Number.isFinite(travelAt.getTime()) || travelAt <= new Date()) {
      throw new BadRequestException('Travel date and time must be in the future.');
    }
    if (TOUR_TYPES.has(input.serviceType) && input.stops.length === 0) {
      throw new BadRequestException('Select at least one destination for a private tour.');
    }

    const profile = await this.prisma.touristServiceProfile.findFirst({
      where: {
        driverId: input.driverId,
        approved: true,
        enabled: true,
        driver: {
          role: 'DRIVER',
          status: 'ACTIVE',
          driver: { verificationStatus: 'VERIFIED' },
        },
        vehicles: { some: { id: input.vehicleId, status: 'ACTIVE' } },
      },
      include: {
        vehicles: { where: { id: input.vehicleId, status: 'ACTIVE' } },
      },
    });
    const vehicle = profile?.vehicles[0];
    if (!profile || !vehicle) {
      throw new NotFoundException('This driver or vehicle is not eligible for tourist services.');
    }
    if (
      !profile.availableFrom ||
      !profile.availableUntil ||
      travelAt < profile.availableFrom ||
      travelAt > profile.availableUntil ||
      !profile.serviceTypes.includes(input.serviceType)
    ) {
      throw new ConflictException(
        'This driver does not offer the selected service at that time. Choose a service and time within the published availability.',
      );
    }
    const capacity = vehicle.touristCapacity ?? vehicle.capacity ?? 0;
    if (capacity < input.passengerCount) {
      throw new ConflictException('The selected vehicle does not have enough passenger capacity.');
    }
    if (vehicle.luggageCapacity !== null && input.luggageCount && input.luggageCount > vehicle.luggageCapacity) {
      throw new ConflictException('The selected vehicle does not have enough luggage capacity.');
    }

    const recentRequests = await this.prisma.touristRequest.count({
      where: {
        contactPhone: input.contactPhone.trim(),
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recentRequests >= 5) {
      throw new ConflictException('Too many requests for this contact number. Please try again later.');
    }

    const reference = `VST-${randomBytes(18).toString('base64url')}`;
    const accessToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashGuestToken(reference, accessToken);
    const stops = input.stops.map((name) => name.trim()).filter(Boolean);
    const knownDestinations = stops.length
      ? await this.prisma.touristDestination.findMany({
          where: { name: { in: stops }, active: true },
          select: { id: true, name: true },
        })
      : [];
    const destinationsByName = new Map(
      knownDestinations.map((destination) => [destination.name.toLowerCase(), destination.id]),
    );

    const request = await this.prisma.touristRequest.create({
      data: {
        reference,
        accessTokenHash: tokenHash,
        requesterId: requesterId ?? null,
        assignedDriverId: input.driverId,
        assignedVehicleId: input.vehicleId,
        requesterName: input.requesterName.trim(),
        contactEmail: input.contactEmail?.trim().toLowerCase() || null,
        contactPhone: input.contactPhone.trim(),
        serviceType: input.serviceType,
        pickupLocation: input.pickupLocation.trim(),
        travelAt,
        passengerCount: input.passengerCount,
        luggageCount: input.luggageCount ?? 0,
        flightNumber: input.flightNumber?.trim() || null,
        cruiseShipName: input.cruiseShipName?.trim() || null,
        specialRequests: input.specialRequests?.trim() || null,
        expiresAt: new Date(travelAt.getTime() + 24 * 60 * 60 * 1000),
        stops: {
          create: stops.map((name, index) => ({
            name,
            sequence: index + 1,
            destinationId: destinationsByName.get(name.toLowerCase()),
          })),
        },
      },
      select: {
        id: true,
        reference: true,
        status: true,
        travelAt: true,
      },
    });

    return {
      ...request,
      accessToken,
      notice: 'Keep this access token private. It is needed with the reference to view your request.',
    };
  }

  async getGuestRequest(reference: string, accessToken: string) {
    const request = await this.getAndVerifyGuestRequest(reference, accessToken);
    return this.guestRequestResponse(request);
  }

  async cancelGuestRequest(reference: string, accessToken: string) {
    const request = await this.getAndVerifyGuestRequest(reference, accessToken);
    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const cancelled = await transaction.touristRequest.updateMany({
            where: {
              id: request.id,
              status: { in: ['REQUESTED', 'QUOTED'] },
            },
            data: { status: 'CANCELLED' },
          });
          if (cancelled.count !== 1) {
            throw new ConflictException(
              'Only requests awaiting a quote can be cancelled. Contact the driver about a confirmed tour.',
            );
          }
          await transaction.touristQuote.updateMany({
            where: { requestId: request.id, status: 'SENT' },
            data: { status: 'WITHDRAWN' },
          });
          return { reference, status: 'CANCELLED' };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'The request status changed while cancelling. Refresh it and try again.',
        );
      }
      throw error;
    }
  }

  async listGuestQuotes(reference: string, accessToken: string) {
    const request = await this.getAndVerifyGuestRequest(reference, accessToken);
    return request.quotes
      .filter((quote) => quote.status === 'SENT')
      .map((quote) => this.quoteResponse(quote));
  }

  async createQuote(driverId: string, requestId: string, input: CreateTouristQuoteDto) {
    const request = await this.prisma.touristRequest.findUnique({
      where: { id: requestId },
      include: {
        assignedVehicle: true,
        stops: { orderBy: { sequence: 'asc' } },
      },
    });
    if (!request || request.assignedDriverId !== driverId) {
      throw new NotFoundException('Tour request not found.');
    }
    if (request.status !== 'REQUESTED' && request.status !== 'QUOTED') {
      throw new ConflictException('This request is no longer accepting quotes.');
    }
    if (request.expiresAt <= new Date() || request.travelAt <= new Date()) {
      throw new ConflictException('This tour request has expired.');
    }
    if (input.expiresAt <= new Date().toISOString() || new Date(input.expiresAt) >= request.travelAt) {
      throw new BadRequestException('Quote expiry must be in the future and before the requested travel time.');
    }

    const profile = await this.prisma.touristServiceProfile.findFirst({
      where: {
        driverId,
        approved: true,
        enabled: true,
        availableFrom: { lte: request.travelAt },
        availableUntil: { gte: request.travelAt },
        serviceTypes: { has: request.serviceType },
        vehicles: { some: { id: request.assignedVehicleId ?? '' } },
        driver: { driver: { verificationStatus: 'VERIFIED' }, status: 'ACTIVE' },
      },
    });
    if (!profile || !request.assignedVehicleId || !request.assignedVehicle) {
      throw new ForbiddenException('Tourist service or selected vehicle is no longer available.');
    }

    const capacity = request.assignedVehicle.touristCapacity ?? request.assignedVehicle.capacity ?? 0;
    if (capacity < request.passengerCount) {
      throw new ConflictException('The assigned vehicle cannot accommodate this passenger count.');
    }
    if (
      request.assignedVehicle.luggageCapacity !== null &&
      request.luggageCount > request.assignedVehicle.luggageCapacity
    ) {
      throw new ConflictException('The assigned vehicle cannot accommodate this luggage count.');
    }
    const quotedEndAt = new Date(
      request.travelAt.getTime() + input.durationHours * 60 * 60 * 1000,
    );
    if (profile.availableUntil && quotedEndAt > profile.availableUntil) {
      throw new ConflictException('The requested trip duration exceeds this driver’s availability.');
    }
    const bookingConflict = await this.prisma.touristBooking.findFirst({
      where: {
        status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
        startAt: { lt: quotedEndAt },
        endAt: { gt: request.travelAt },
        OR: [{ driverId }, { vehicleId: request.assignedVehicleId }],
      },
      select: { id: true },
    });
    if (bookingConflict) {
      throw new ConflictException('The driver or selected vehicle is already booked during this time.');
    }

    const quote = await this.prisma.touristQuote.create({
      data: {
        requestId,
        driverId,
        vehicleId: request.assignedVehicleId,
        amount: input.amount,
        currency: 'VUV',
        durationHours: input.durationHours,
        includedServices: input.includedServices.map((service) => service.trim()).filter(Boolean),
        excludedServices: input.excludedServices.map((service) => service.trim()).filter(Boolean),
        waitingTerms: input.waitingTerms?.trim() || null,
        cancellationTerms: input.cancellationTerms?.trim() || null,
        expiresAt: new Date(input.expiresAt),
      },
    });
    await this.prisma.touristRequest.update({
      where: { id: requestId },
      data: { status: 'QUOTED' },
    });
    return this.quoteResponse(quote);
  }

  async listDriverRequests(driverId: string) {
    await this.requireApprovedDriver(driverId);
    const requests = await this.prisma.touristRequest.findMany({
      where: {
        assignedDriverId: driverId,
        status: { in: ['REQUESTED', 'QUOTED'] },
        expiresAt: { gt: new Date() },
      },
      include: { stops: { orderBy: { sequence: 'asc' } } },
      orderBy: { travelAt: 'asc' },
    });
    return requests.map((request) => ({
      id: request.id,
      requesterName: request.requesterName,
      contactPhone: request.contactPhone,
      contactEmail: request.contactEmail,
      serviceType: request.serviceType,
      pickupLocation: request.pickupLocation,
      travelAt: request.travelAt.toISOString(),
      passengerCount: request.passengerCount,
      luggageCount: request.luggageCount,
      flightNumber: request.flightNumber,
      cruiseShipName: request.cruiseShipName,
      specialRequests: request.specialRequests,
      stops: request.stops.map((stop) => stop.name),
      status: request.status,
    }));
  }

  async declineRequest(driverId: string, requestId: string) {
    await this.requireApprovedDriver(driverId);
    const updated = await this.prisma.touristRequest.updateMany({
      where: {
        id: requestId,
        assignedDriverId: driverId,
        status: 'REQUESTED',
      },
      data: { status: 'DECLINED' },
    });
    if (updated.count !== 1) {
      throw new NotFoundException('Open tourist request not found.');
    }
    return { success: true };
  }

  async listDriverBookings(driverId: string) {
    await this.requireApprovedDriver(driverId);
    const bookings = await this.prisma.touristBooking.findMany({
      where: {
        driverId,
        OR: [
          { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } },
          { status: 'COMPLETED', paymentStatus: { not: 'PAID' } },
        ],
      },
      include: {
        request: { include: { stops: { orderBy: { sequence: 'asc' } } } },
        quote: true,
        vehicle: true,
      },
      orderBy: { startAt: 'asc' },
    });
    return bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paidAmount: booking.paidAmount.toString(),
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      requesterName: booking.request.requesterName,
      contactPhone: booking.request.contactPhone,
      pickupLocation: booking.request.pickupLocation,
      stops: booking.request.stops.map((stop) => stop.name),
      passengerCount: booking.request.passengerCount,
      luggageCount: booking.request.luggageCount,
      amount: booking.quote.amount.toString(),
      currency: booking.quote.currency,
      vehicleName: [booking.vehicle.make, booking.vehicle.model].filter(Boolean).join(' ') ||
        booking.vehicle.vehicleType,
    }));
  }

  async updateBookingStatus(
    driverId: string,
    bookingId: string,
    status: 'IN_PROGRESS' | 'COMPLETED',
  ) {
    const booking = await this.prisma.touristBooking.findFirst({
      where: { id: bookingId, driverId },
    });
    if (!booking) throw new NotFoundException('Tour booking not found.');
    if (status === 'IN_PROGRESS' && booking.status !== 'CONFIRMED') {
      throw new ConflictException('Only a confirmed tour can be started.');
    }
    if (status === 'COMPLETED' && booking.status !== 'IN_PROGRESS') {
      throw new ConflictException('Only an active tour can be completed.');
    }
    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.touristBooking.update({
        where: { id: bookingId },
        data: { status },
      }),
      this.prisma.touristRequest.update({
        where: { id: booking.requestId },
        data: { status },
      }),
    ]);
    return { id: updatedBooking.id, status: updatedBooking.status };
  }

  async recordCashPayment(
    driverId: string,
    bookingId: string,
    paymentStatus: CashPaymentStatus,
    paidAmount: number,
  ) {
    const booking = await this.prisma.touristBooking.findFirst({
      where: { id: bookingId, driverId },
      include: { quote: true },
    });
    if (!booking) throw new NotFoundException('Tour booking not found.');
    if (booking.status !== 'IN_PROGRESS' && booking.status !== 'COMPLETED') {
      throw new ConflictException('Cash can only be recorded for an active or completed tour.');
    }
    const agreedAmount = Number(booking.quote.amount);
    if (
      paidAmount < 0 ||
      paidAmount > agreedAmount ||
      (paymentStatus === 'PAID' && paidAmount !== agreedAmount) ||
      (paymentStatus === 'UNPAID' && paidAmount !== 0) ||
      (paymentStatus === 'PARTIALLY_PAID' && (paidAmount <= 0 || paidAmount >= agreedAmount))
    ) {
      throw new BadRequestException('Cash amount does not match the selected payment status.');
    }
    const updated = await this.prisma.touristBooking.update({
      where: { id: bookingId },
      data: { paymentStatus, paidAmount },
    });
    return {
      id: updated.id,
      paymentStatus: updated.paymentStatus,
      paidAmount: updated.paidAmount.toString(),
      currency: booking.quote.currency,
    };
  }

  async confirmQuote(quoteId: string, reference: string, accessToken: string) {
    const request = await this.getAndVerifyGuestRequest(reference, accessToken);
    const quote = request.quotes.find((item) => item.id === quoteId);
    if (!quote || quote.status !== 'SENT') {
      throw new NotFoundException('Open quote not found for this guest request.');
    }
    if (quote.expiresAt <= new Date()) {
      await this.prisma.touristQuote.update({
        where: { id: quote.id },
        data: { status: 'EXPIRED' },
      });
      throw new ConflictException('This quote has expired.');
    }
    if (request.status === 'CONFIRMED' || request.status === 'CANCELLED') {
      throw new ConflictException('This request can no longer be confirmed.');
    }

    const profile = await this.prisma.touristServiceProfile.findFirst({
      where: {
        driverId: quote.driverId,
        approved: true,
        enabled: true,
        availableFrom: { lte: request.travelAt },
        availableUntil: {
          gte: new Date(
            request.travelAt.getTime() + Number(quote.durationHours) * 60 * 60 * 1000,
          ),
        },
        serviceTypes: { has: request.serviceType },
        vehicles: { some: { id: quote.vehicleId, status: 'ACTIVE' } },
      },
    });
    if (!profile) {
      throw new ConflictException('The selected tourist service is no longer available.');
    }
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: quote.vehicleId } });
    if (!vehicle || vehicle.status !== 'ACTIVE') {
      throw new ConflictException('The quoted vehicle is no longer available.');
    }
    if ((vehicle.touristCapacity ?? vehicle.capacity ?? 0) < request.passengerCount) {
      throw new ConflictException('The quoted vehicle no longer meets the passenger capacity.');
    }
    if (
      vehicle.luggageCapacity !== null &&
      request.luggageCount > vehicle.luggageCapacity
    ) {
      throw new ConflictException('The quoted vehicle no longer meets the luggage capacity.');
    }

    const startAt = request.travelAt;
    const endAt = new Date(startAt.getTime() + Number(quote.durationHours) * 60 * 60 * 1000);
    try {
      const booking = await this.prisma.$transaction(
        async (transaction) => {
          const conflict = await transaction.touristBooking.findFirst({
            where: {
              status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
              startAt: { lt: endAt },
              endAt: { gt: startAt },
              OR: [{ driverId: quote.driverId }, { vehicleId: quote.vehicleId }],
            },
            select: { id: true },
          });
          if (conflict) {
            throw new ConflictException('The driver or vehicle is already booked for that time.');
          }

          const stillOpen = await transaction.touristQuote.updateMany({
            where: {
              id: quote.id,
              requestId: request.id,
              status: 'SENT',
              expiresAt: { gt: new Date() },
            },
            data: { status: 'ACCEPTED' },
          });
          if (stillOpen.count !== 1) {
            throw new ConflictException('This quote has expired or was already confirmed.');
          }

          const createdBooking = await transaction.touristBooking.create({
            data: {
              requestId: request.id,
              quoteId: quote.id,
              driverId: quote.driverId,
              vehicleId: quote.vehicleId,
              startAt,
              endAt,
            },
            select: { id: true, status: true },
          });
          await transaction.touristRequest.update({
            where: { id: request.id },
            data: { status: 'CONFIRMED' },
          });
          await transaction.touristQuote.updateMany({
            where: { requestId: request.id, id: { not: quote.id }, status: 'SENT' },
            data: { status: 'EXPIRED' },
          });
          return createdBooking;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return {
        ...booking,
        reference: request.reference,
        amount: quote.amount.toString(),
        currency: quote.currency,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        paymentStatus: CashPaymentStatus.UNPAID,
        paymentNotice: 'Cash is paid directly to the driver; it is not processed by this app.',
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException('The booking could not be reserved because availability changed. Please try again.');
      }
      throw error;
    }
  }

  private async requireApprovedDriver(driverId: string) {
    const profile = await this.prisma.touristServiceProfile.findFirst({
      where: {
        driverId,
        approved: true,
        enabled: true,
        driver: { role: 'DRIVER', status: 'ACTIVE', driver: { verificationStatus: 'VERIFIED' } },
      },
      select: { id: true },
    });
    if (!profile) {
      throw new ForbiddenException('Your tourist transport service must be published and enabled.');
    }
  }

  private async getAndVerifyGuestRequest(reference: string, accessToken: string) {
    const request = await this.prisma.touristRequest.findUnique({
      where: { reference },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        quotes: {
          include: {
            driver: { select: { firstName: true, lastName: true } },
            vehicle: { select: { make: true, model: true, vehicleType: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        booking: true,
      },
    });
    const providedHash = this.hashGuestToken(reference, accessToken);
    if (
      !request ||
      !this.constantTimeHashMatches(request.accessTokenHash, providedHash)
    ) {
      throw new NotFoundException('Tourist request not found.');
    }
    return request;
  }

  private guestRequestResponse(request: Awaited<ReturnType<TouristService['getAndVerifyGuestRequest']>>) {
    return {
      reference: request.reference,
      requesterName: request.requesterName,
      serviceType: request.serviceType,
      pickupLocation: request.pickupLocation,
      travelAt: request.travelAt.toISOString(),
      passengerCount: request.passengerCount,
      luggageCount: request.luggageCount,
      specialRequests: request.specialRequests,
      status: request.status,
      stops: request.stops.map((stop) => stop.name),
      quotes: request.quotes
        .filter((quote) => quote.status === 'SENT')
        .map((quote) => this.quoteResponse(quote)),
      booking: request.booking
        ? {
            status: request.booking.status,
            startAt: request.booking.startAt.toISOString(),
            endAt: request.booking.endAt.toISOString(),
            paymentStatus: request.booking.paymentStatus,
            paidAmount: request.booking.paidAmount.toString(),
          }
        : null,
    };
  }

  private quoteResponse(quote: {
    id: string;
    amount: Prisma.Decimal;
    currency: string;
    durationHours: Prisma.Decimal;
    includedServices: string[];
    excludedServices: string[];
    waitingTerms: string | null;
    cancellationTerms: string | null;
    expiresAt: Date;
    driver?: { firstName: string; lastName: string };
    vehicle?: { make: string | null; model: string | null; vehicleType: string };
  }) {
    return {
      id: quote.id,
      amount: quote.amount.toString(),
      currency: quote.currency,
      durationHours: quote.durationHours.toString(),
      includedServices: quote.includedServices,
      excludedServices: quote.excludedServices,
      waitingTerms: quote.waitingTerms,
      cancellationTerms: quote.cancellationTerms,
      expiresAt: quote.expiresAt.toISOString(),
      driverName: quote.driver
        ? `${quote.driver.firstName} ${quote.driver.lastName}`.trim()
        : undefined,
      vehicleName: quote.vehicle
        ? [quote.vehicle.make, quote.vehicle.model].filter(Boolean).join(' ') ||
          quote.vehicle.vehicleType
        : undefined,
    };
  }

  private hashGuestToken(reference: string, accessToken: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`${reference}:${accessToken}`)
      .digest('hex');
  }

  private constantTimeHashMatches(expected: string, actual: string): boolean {
    const expectedBytes = Buffer.from(expected, 'hex');
    const actualBytes = Buffer.from(actual, 'hex');
    return expectedBytes.length === actualBytes.length &&
      timingSafeEqual(expectedBytes, actualBytes);
  }
}
