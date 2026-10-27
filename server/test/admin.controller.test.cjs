const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ForbiddenException, UnauthorizedException } = require('@nestjs/common');
const { AdminController } = require('../dist/src/admin/admin.controller');

function createController(payload) {
  let driverListReads = 0;
  const prisma = {
    user: {
      findMany: async () => {
        driverListReads += 1;
        return [];
      },
      findUnique: async () => null,
    },
    driver: {
      update: async () => ({}),
    },
  };
  const jwt = {
    verifyAsync: async () => {
      if (payload instanceof Error) throw payload;
      return payload;
    },
  };

  return {
    controller: new AdminController(prisma, jwt),
    getDriverListReads: () => driverListReads,
  };
}

test('admin routes reject requests without a bearer token', async () => {
  const { controller, getDriverListReads } = createController({
    sub: 'admin-id',
    role: 'ADMIN',
  });
  await assert.rejects(controller.getDrivers(), UnauthorizedException);
  await assert.rejects(controller.verifyDriver(undefined, 'driver-id'), UnauthorizedException);
  await assert.rejects(controller.suspendDriver(undefined, 'driver-id'), UnauthorizedException);
  await assert.rejects(
    controller.rejectDriver(undefined, 'driver-id', {}),
    UnauthorizedException,
  );
  assert.equal(getDriverListReads(), 0);
});

test('admin routes reject non-admin tokens', async () => {
  const { controller } = createController({ sub: 'driver-id', role: 'DRIVER' });
  await assert.rejects(
    controller.getDrivers('Bearer driver-token'),
    ForbiddenException,
  );
});

test('admin routes reject invalid tokens', async () => {
  const { controller } = createController(new Error('invalid signature'));
  await assert.rejects(
    controller.getDrivers('Bearer invalid-token'),
    UnauthorizedException,
  );
});

test('a valid admin token can access the driver list', async () => {
  const { controller, getDriverListReads } = createController({
    sub: 'admin-id',
    role: 'ADMIN',
  });
  assert.deepEqual(await controller.getDrivers('Bearer admin-token'), []);
  assert.equal(getDriverListReads(), 1);
});
