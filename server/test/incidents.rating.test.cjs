const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ConflictException, ForbiddenException } = require('@nestjs/common');
const { IncidentsService } = require('../dist/src/incidents/incidents.service');

function createService(overrides = {}) {
  const booking = {
    id: 'booking-1',
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    status: 'COMPLETED',
    passenger: { firstName: 'Test', lastName: 'Passenger' },
  };
  let createdRating;
  const prisma = {
    booking: { findUnique: async () => ({ ...booking, ...overrides.booking }) },
    incident: {
      findFirst: async () => overrides.existingRating ?? null,
      create: async ({ data }) => {
        if (overrides.createError) throw overrides.createError;
        createdRating = data;
        return data;
      },
    },
  };
  return {
    service: new IncidentsService(prisma),
    getCreatedRating: () => createdRating,
  };
}

test('a passenger cannot rate another passenger booking', async () => {
  const { service } = createService();
  await assert.rejects(
    service.rateDriver('passenger-2', 'booking-1', 5),
    ForbiddenException,
  );
});

test('only completed bookings can be rated', async () => {
  const { service } = createService({ booking: { status: 'CONFIRMED' } });
  await assert.rejects(
    service.rateDriver('passenger-1', 'booking-1', 5),
    ConflictException,
  );
});

test('a booking cannot be rated more than once', async () => {
  const { service } = createService({ existingRating: { id: 'rating-1' } });
  await assert.rejects(
    service.rateDriver('passenger-1', 'booking-1', 5),
    ConflictException,
  );
});

test('the database unique constraint rejects concurrent duplicate ratings', async () => {
  const { service } = createService({
    createError: { code: 'P2002' },
  });
  await assert.rejects(
    service.rateDriver('passenger-1', 'booking-1', 5),
    ConflictException,
  );
});

test('a completed booking can be rated once with an integer star count', async () => {
  const { service, getCreatedRating } = createService();
  await service.rateDriver('passenger-1', 'booking-1', 4, 'Good trip');
  assert.equal(getCreatedRating().tripId, 'booking-1');
  assert.equal(getCreatedRating().reporterId, 'passenger-1');
  assert.match(getCreatedRating().description, /"rating":4/);
});
