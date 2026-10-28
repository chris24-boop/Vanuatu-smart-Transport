const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ConflictException } = require('@nestjs/common');
const { AuthService } = require('../dist/src/auth/auth.service');

test('driver registration reports duplicate licence or vehicle details as a conflict', async () => {
  const service = new AuthService(
    {
      user: {
        findFirst: async () => null,
        create: async () => {
          throw { code: 'P2002' };
        },
      },
    },
    {},
    {},
    {},
  );

  await assert.rejects(
    service.register({
      firstName: 'Test',
      lastName: 'Driver',
      phone: '+6781234567',
      email: 'driver@example.com',
      password: 'secure-password',
      role: 'DRIVER',
      licenceNumber: 'LIC-123',
    }),
    (error) => {
      assert.ok(error instanceof ConflictException);
      assert.match(error.message, /driver licence number/);
      return true;
    },
  );
});
