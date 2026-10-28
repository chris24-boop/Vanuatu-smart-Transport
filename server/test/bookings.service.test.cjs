const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ConflictException } = require('@nestjs/common');
const { BookingsService } = require('../dist/src/bookings/bookings.service');

function createBookingService(initialSeats, totalSeats = Math.max(1, initialSeats)) {
  const trip = {
    id: 'trip-1',
    driverId: 'driver-1',
    routeId: 'route-1',
    status: 'PLANNED',
    totalSeats,
    availableSeats: initialSeats,
    fare: 100,
    vehicle: { vehicleType: 'BUS' },
    route: {
      stops: [
        { id: 'pickup', name: 'Port Vila' },
        { id: 'dropoff', name: 'Airport' },
      ],
    },
  };
  let bookingCreates = 0;
  let bookingStatus = 'REQUESTED';
  const prisma = {
    trip: {
      findUnique: async () => ({ ...trip, availableSeats: initialSeats }),
      updateMany: async ({ where, data }) => {
        if (
          trip.id !== where.id ||
          (where.availableSeats?.gte !== undefined &&
            trip.availableSeats < where.availableSeats.gte) ||
          (where.availableSeats?.lte !== undefined &&
            trip.availableSeats > where.availableSeats.lte) ||
          ['COMPLETED', 'CANCELLED'].includes(trip.status)
        ) {
          return { count: 0 };
        }
        if (data.availableSeats.decrement !== undefined) {
          trip.availableSeats -= data.availableSeats.decrement;
        }
        if (data.availableSeats.increment !== undefined) {
          trip.availableSeats += data.availableSeats.increment;
        }
        return { count: 1 };
      },
      findFirst: async () => null,
    },
    stop: { create: async () => ({}) },
    booking: {
      create: async () => {
        bookingCreates += 1;
        return {
          id: `booking-${bookingCreates}`,
          passengerId: 'passenger-1',
          driverId: 'driver-1',
          tripId: 'trip-1',
          status: 'REQUESTED',
          fare: 100,
          currency: 'VT',
          createdAt: new Date(),
          driver: {
            firstName: 'Test',
            lastName: 'Driver',
            phone: '+6780000000',
            vehicles: [{ vehicleType: 'BUS', registrationNumber: 'BUS-1', model: 'Bus' }],
          },
          trip: { fare: 100 },
          pickupStop: { name: 'Port Vila' },
          dropoffStop: { name: 'Airport' },
        };
      },
      findUnique: async () => ({
        id: 'booking-1',
        passengerId: 'passenger-1',
        driverId: 'driver-1',
        tripId: 'trip-1',
        status: bookingStatus,
        seatsCount: 2,
        trip: { totalSeats },
      }),
      updateMany: async ({ where, data }) => {
        const statusMatches = typeof where.status === 'string'
          ? where.status === bookingStatus
          : where.status.in.includes(bookingStatus);
        if (
          (where.passengerId !== undefined && where.passengerId !== 'passenger-1') ||
          (where.id !== undefined && where.id !== 'booking-1') ||
          !statusMatches
        ) {
          return { count: 0 };
        }
        bookingStatus = data.status;
        return { count: 1 };
      },
    },
    $transaction: async (operation) =>
      operation({
        trip: {
          updateMany: prismaTripUpdateManyPlaceholder,
        },
        booking: {
          create: (...args) => prisma.booking.create(...args),
          updateMany: (...args) => prisma.booking.updateMany(...args),
          findUniqueOrThrow: async () => ({
            id: 'booking-1',
            passengerId: 'passenger-1',
            driverId: 'driver-1',
            tripId: 'trip-1',
            status: bookingStatus,
            createdAt: new Date(),
            driver: {
              firstName: 'Test',
              lastName: 'Driver',
              phone: '+6780000000',
              vehicles: [{ vehicleType: 'BUS', registrationNumber: 'BUS-1', model: 'Bus' }],
            },
            trip: { fare: 100 },
          }),
        },
      }),
  };

  async function prismaTripUpdateManyPlaceholder(args) {
    return prisma.trip.updateMany(args);
  }

  const service = new BookingsService(prisma, {});
  return {
    service,
    getAvailableSeats: () => trip.availableSeats,
    getBookingCreates: () => bookingCreates,
  };
}

const bookingInput = {
  tripId: 'trip-1',
  pickupLocation: 'Port Vila',
  dropoffLocation: 'Airport',
};

test('booking reserves seats with a conditional atomic decrement', async () => {
  const { service, getAvailableSeats, getBookingCreates } = createBookingService(2);
  await service.createBooking('passenger-1', { ...bookingInput, seatsCount: 2 });
  assert.equal(getAvailableSeats(), 0);
  assert.equal(getBookingCreates(), 1);
});

test('booking rejects when the trip has no remaining seats', async () => {
  const { service, getAvailableSeats, getBookingCreates } = createBookingService(0);
  await assert.rejects(
    service.createBooking('passenger-1', bookingInput),
    ConflictException,
  );
  assert.equal(getAvailableSeats(), 0);
  assert.equal(getBookingCreates(), 0);
});

test('concurrent bookings cannot reserve the same final seat', async () => {
  const { service, getAvailableSeats, getBookingCreates } = createBookingService(1);
  const results = await Promise.allSettled([
    service.createBooking('passenger-1', bookingInput),
    service.createBooking('passenger-2', bookingInput),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(getAvailableSeats(), 0);
  assert.equal(getBookingCreates(), 1);
});

test('cancelling a passenger booking returns its reserved seat', async () => {
  const { service, getAvailableSeats } = createBookingService(0, 2);
  await service.cancelBooking('passenger-1', 'booking-1');
  assert.equal(getAvailableSeats(), 2);
});

test('driver cancellation returns all seats reserved by a booking', async () => {
  const { service, getAvailableSeats } = createBookingService(0, 2);
  await service.updateBookingStatus('driver-1', 'booking-1', 'CANCELLED');
  assert.equal(getAvailableSeats(), 2);
});
