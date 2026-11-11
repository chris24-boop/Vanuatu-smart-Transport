const assert = require('node:assert/strict');
const { test } = require('node:test');
const { BadRequestException } = require('@nestjs/common');
const { AdminController } = require('../dist/src/admin/admin.controller');

function createController(documents = []) {
  const updates = [];
  const auditEntries = [];
  const prisma = {
    driver: {
      findUnique: async () => ({
        id: 'driver-record-1',
        user: { firstName: 'Test', lastName: 'Driver' },
        documents,
      }),
    },
    $transaction: async (operation) =>
      operation({
        driver: {
          update: async (input) => updates.push(input),
        },
        adminAuditLog: {
          create: async (input) => auditEntries.push(input),
        },
      }),
  };
  const jwt = { verifyAsync: async () => ({ sub: 'admin-1', role: 'ADMIN' }) };
  return { controller: new AdminController(prisma, jwt), updates, auditEntries };
}

test('driver rejection is distinct from suspension and saves an auditable reason', async () => {
  const rejected = createController();
  await rejected.controller.rejectDriver('Bearer token', 'driver-1', { reason: '  Invalid licence  ' });
  assert.equal(rejected.updates[0].data.verificationStatus, 'REJECTED');
  assert.equal(rejected.updates[0].data.rejectionReason, 'Invalid licence');
  assert.equal(rejected.updates[0].data.suspensionReason, null);
  assert.equal(rejected.auditEntries[0].data.action, 'DRIVER_REJECTED');
  assert.deepEqual(rejected.auditEntries[0].data.details, { reason: 'Invalid licence' });

  const suspended = createController();
  await suspended.controller.suspendDriver('Bearer token', 'driver-1', { reason: '  Safety investigation  ' });
  assert.equal(suspended.updates[0].data.verificationStatus, 'SUSPENDED');
  assert.equal(suspended.updates[0].data.suspensionReason, 'Safety investigation');
  assert.equal(suspended.auditEntries[0].data.action, 'DRIVER_SUSPENDED');
});

test('driver verification requires the newest licence and registration documents to be approved', async () => {
  const controller = createController([
    { type: 'LICENCE', status: 'PENDING' },
    { type: 'LICENCE', status: 'APPROVED' },
    { type: 'VEHICLE_REGISTRATION', status: 'APPROVED' },
  ]);
  await assert.rejects(
    controller.controller.verifyDriver('Bearer token', 'driver-1'),
    BadRequestException,
  );
  assert.equal(controller.updates.length, 0);
  assert.equal(controller.auditEntries.length, 0);
});
