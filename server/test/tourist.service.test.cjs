const assert = require('node:assert/strict');
const { test } = require('node:test');
const { BadRequestException, ConflictException } = require('@nestjs/common');
const { Prisma } = require('@prisma/client');
const { TouristService } = require('../dist/src/tourist/tourist.service');

function createService(cancelledCount) {
  const calls = [];
  const transaction = {
    touristRequest: {
      updateMany: async (input) => {
        calls.push(['cancel-request', input]);
        return { count: cancelledCount };
      },
    },
    touristQuote: {
      updateMany: async (input) => {
        calls.push(['withdraw-quotes', input]);
        return { count: 1 };
      },
    },
  };
  const prisma = {
    $transaction: async (callback, options) => {
      calls.push(['transaction-isolation', options.isolationLevel]);
      return callback(transaction);
    },
  };
  const service = new TouristService(prisma, {});
  service.getAndVerifyGuestRequest = async (reference, accessToken) => {
    calls.push(['verify-guest', reference, accessToken]);
    return { id: 'request-1' };
  };
  return { service, calls };
}

function createApplicationService() {
  const calls = [];
  const profile = {
    id: 'profile-1',
    approved: true,
    enabled: true,
    serviceArea: 'Port Vila',
    languages: ['English'],
    serviceTypes: ['AIRPORT_TRANSFER'],
    pricingDescription: 'From 5,000 VUV',
    availableFrom: new Date(Date.now() + 60 * 60 * 1000),
    availableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
  const prisma = {
    user: {
      findUnique: async () => ({
        role: 'DRIVER',
        driver: { verificationStatus: 'VERIFIED' },
        vehicles: [{ id: 'vehicle-1', capacity: 8 }],
      }),
    },
    touristServiceProfile: {
      upsert: async (input) => {
        calls.push(['profile-upsert', input]);
        return profile;
      },
    },
    vehicle: {
      updateMany: async (input) => {
        calls.push(['vehicle-update-many', input]);
        return { count: 1 };
      },
      update: async (input) => {
        calls.push(['vehicle-update', input]);
        return input;
      },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  return { service: new TouristService(prisma, {}), calls };
}

test('guest cancellation verifies access and atomically withdraws quotes for open requests', async () => {
  const { service, calls } = createService(1);

  assert.deepEqual(
    await service.cancelGuestRequest('VST-reference', 'private-code'),
    { reference: 'VST-reference', status: 'CANCELLED' },
  );
  assert.deepEqual(calls, [
    ['verify-guest', 'VST-reference', 'private-code'],
    ['transaction-isolation', Prisma.TransactionIsolationLevel.Serializable],
    [
      'cancel-request',
      {
        where: { id: 'request-1', status: { in: ['REQUESTED', 'QUOTED'] } },
        data: { status: 'CANCELLED' },
      },
    ],
    [
      'withdraw-quotes',
      { where: { requestId: 'request-1', status: 'SENT' }, data: { status: 'WITHDRAWN' } },
    ],
  ]);
});

test('guest cancellation rejects requests that are no longer open', async () => {
  const { service, calls } = createService(0);

  await assert.rejects(
    service.cancelGuestRequest('VST-reference', 'private-code'),
    ConflictException,
  );
  assert.equal(calls.some(([operation]) => operation === 'withdraw-quotes'), false);
});

test('driver tourist listing saves availability, service choices and vehicle capacities', async () => {
  const { service, calls } = createApplicationService();
  const availableFrom = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const availableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const result = await service.applyForTouristService('driver-1', {
    serviceArea: 'Port Vila',
    languages: ['English'],
    vehicleIds: ['vehicle-1'],
    vehicleCapacities: [
      { vehicleId: 'vehicle-1', passengerCapacity: 6, luggageCapacity: 4 },
    ],
    serviceTypes: ['AIRPORT_TRANSFER'],
    pricingDescription: 'From 5,000 VUV',
    availableFrom,
    availableUntil,
  });

  assert.equal(result.approved, true);
  assert.equal(result.enabled, true);
  assert.equal(calls[0][1].create.approved, true);
  assert.equal(calls[0][1].create.enabled, true);
  assert.deepEqual(calls[0][1].update.serviceTypes, ['AIRPORT_TRANSFER']);
  assert.equal(calls[0][1].update.approved, true);
  assert.equal(calls[0][1].update.enabled, true);
  assert.deepEqual(
    calls.find(([operation]) => operation === 'vehicle-update')[1],
    {
      where: { id: 'vehicle-1' },
      data: { touristCapacity: 6, luggageCapacity: 4 },
    },
  );
});

test('driver cannot publish more tourist passenger seats than the registered vehicle capacity', async () => {
  const { service, calls } = createApplicationService();
  const availableFrom = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const availableUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await assert.rejects(
    service.applyForTouristService('driver-1', {
      serviceArea: 'Port Vila',
      languages: ['English'],
      vehicleIds: ['vehicle-1'],
      vehicleCapacities: [
        { vehicleId: 'vehicle-1', passengerCapacity: 9, luggageCapacity: 4 },
      ],
      serviceTypes: ['AIRPORT_TRANSFER'],
      pricingDescription: 'From 5,000 VUV',
      availableFrom,
      availableUntil,
    }),
    BadRequestException,
  );
  assert.equal(calls.some(([operation]) => operation === 'profile-upsert'), false);
});
