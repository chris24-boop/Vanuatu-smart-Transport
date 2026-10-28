const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ForbiddenException, UnauthorizedException } = require('@nestjs/common');
const { BookingsController } = require('../dist/src/bookings/bookings.controller');

function createController(payload) {
  let locationUpdate;
  const controller = new BookingsController(
    {
      updateDriverLocation: async (...args) => {
        locationUpdate = args;
        return { success: true };
      },
    },
    {
      verifyAsync: async () => {
        if (payload instanceof Error) throw payload;
        return payload;
      },
    },
  );
  return { controller, getLocationUpdate: () => locationUpdate };
}

test('driver location requires a valid bearer token', async () => {
  const { controller } = createController({ sub: 'driver-1', role: 'DRIVER' });
  await assert.rejects(
    controller.updateDriverLocation(undefined, { latitude: -17, longitude: 168 }),
    UnauthorizedException,
  );
  const { controller: invalidTokenController } = createController(
    new Error('invalid signature'),
  );
  await assert.rejects(
    invalidTokenController.updateDriverLocation('Bearer invalid', {
      latitude: -17,
      longitude: 168,
    }),
    UnauthorizedException,
  );
});

test('driver location uses the authenticated driver id, not a body-supplied id', async () => {
  const { controller, getLocationUpdate } = createController({
    sub: 'authenticated-driver',
    role: 'DRIVER',
  });

  await controller.updateDriverLocation('Bearer valid', {
    driverId: 'attacker-selected-driver',
    latitude: -17.7333,
    longitude: 168.3273,
  });

  assert.deepEqual(getLocationUpdate(), [
    'authenticated-driver',
    -17.7333,
    168.3273,
  ]);
});

test('non-driver tokens cannot update driver location', async () => {
  const { controller } = createController({ sub: 'passenger-1', role: 'PASSENGER' });
  await assert.rejects(
    controller.updateDriverLocation('Bearer valid', { latitude: -17, longitude: 168 }),
    ForbiddenException,
  );
});
