const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ForbiddenException, UnauthorizedException } = require('@nestjs/common');
const { TouristController } = require('../dist/src/tourist/tourist.controller');

function createController(payload) {
  const calls = [];
  const touristService = {
    getDriverServiceApplication: async (id) => {
      calls.push(['driver-application', id]);
      return { profile: null, vehicles: [] };
    },
    applyForTouristService: async (id, input) => {
      calls.push(['apply', id, input]);
      return { approved: true };
    },
    cancelGuestRequest: async (reference, accessToken) => {
      calls.push(['cancel', reference, accessToken]);
      return { reference, status: 'CANCELLED' };
    },
    listAdminDestinations: async () => {
      calls.push(['admin-destinations']);
      return [];
    },
  };
  const jwt = {
    verifyAsync: async () => {
      if (payload instanceof Error) throw payload;
      return payload;
    },
  };
  return {
    controller: new TouristController(touristService, jwt, {}),
    calls,
  };
}

test('tourist driver endpoints require the driver role', async () => {
  const { controller, calls } = createController({ sub: 'driver-1', role: 'DRIVER' });
  await assert.rejects(controller.getDriverServiceApplication(), UnauthorizedException);
  await assert.rejects(
    controller.applyForTouristService(undefined, { vehicleIds: ['vehicle-1'] }),
    UnauthorizedException,
  );
  assert.deepEqual(calls, []);

  assert.deepEqual(
    await controller.getDriverServiceApplication('Bearer token'),
    { profile: null, vehicles: [] },
  );
  assert.deepEqual(calls, [['driver-application', 'driver-1']]);
});

test('administrators manage destinations but have no tourist-service approval endpoint', async () => {
  const { controller, calls } = createController({ sub: 'admin-1', role: 'ADMIN' });
  assert.deepEqual(await controller.listAdminDestinations('Bearer token'), []);
  assert.deepEqual(calls, [['admin-destinations']]);
  assert.equal(controller.setDriverService, undefined);
  assert.equal(controller.listAdminTouristServices, undefined);
});

test('drivers cannot manage administrator destinations', async () => {
  const { controller, calls } = createController({ sub: 'driver-1', role: 'DRIVER' });
  await assert.rejects(
    controller.listAdminDestinations('Bearer token'),
    ForbiddenException,
  );
  assert.deepEqual(calls, []);
});

test('guest request cancellation forwards the private access code for verification', async () => {
  const { controller, calls } = createController(undefined);
  assert.deepEqual(
    await controller.cancelRequest('VST-reference', { accessToken: 'private-code' }),
    { reference: 'VST-reference', status: 'CANCELLED' },
  );
  assert.deepEqual(calls, [['cancel', 'VST-reference', 'private-code']]);
});
