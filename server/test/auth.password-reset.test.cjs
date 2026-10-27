const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { createHmac } = require('node:crypto');
const { test } = require('node:test');
const { BadRequestException } = require('@nestjs/common');
const { AuthService } = require('../dist/src/auth/auth.service');

const jwtSecret = 'test-secret-value-with-more-than-32-characters';

function resetHash(userId, code) {
  return createHmac('sha256', jwtSecret)
    .update(`${userId}:${code}`)
    .digest('hex');
}

test('password reset request sends a six-digit code and stores only its HMAC', async () => {
  let storedToken;
  let sentSms;
  const prisma = {
    user: {
      findUnique: async () => ({ id: 'user-1', phone: '+6781234567' }),
    },
    passwordResetToken: {
      findFirst: async () => null,
      deleteMany: async () => ({ count: 0 }),
      create: async ({ data }) => {
        storedToken = data;
        return data;
      },
    },
  };
  const service = new AuthService(
    prisma,
    {},
    { getOrThrow: () => jwtSecret },
    { sendSms: async (to, message) => (sentSms = { to, message }) },
  );

  const response = await service.requestPasswordReset(' +6781234567 ');
  const code = sentSms.message.match(/\b\d{6}\b/)?.[0];

  assert.match(response.message, /If an account exists/);
  assert.equal(sentSms.to, '+6781234567');
  assert.ok(code);
  assert.equal(storedToken.codeHash, resetHash('user-1', code));
  assert.equal(storedToken.codeHash.includes(code), false);
});

test('password reset request does not reveal unknown phone numbers', async () => {
  let smsSent = false;
  const service = new AuthService(
    { user: { findUnique: async () => null } },
    {},
    { getOrThrow: () => jwtSecret },
    { sendSms: async () => (smsSent = true) },
  );

  const response = await service.requestPasswordReset('+6780000000');
  assert.match(response.message, /If an account exists/);
  assert.equal(smsSent, false);
});

test('incorrect password reset codes increment attempts and are rejected', async () => {
  let attempts = 1;
  const token = {
    id: 'reset-1',
    codeHash: resetHash('user-1', '123456'),
    expiresAt: new Date(Date.now() + 60_000),
    attempts,
  };
  const service = new AuthService(
    {
      user: { findUnique: async () => ({ id: 'user-1' }) },
      passwordResetToken: {
        findFirst: async () => token,
        updateMany: async ({ data }) => {
          attempts += data.attempts.increment;
          return { count: 1 };
        },
      },
      $transaction: async (callback) =>
        callback({
          passwordResetToken: {},
        }),
    },
    {},
    { getOrThrow: () => jwtSecret },
    {},
  );

  await assert.rejects(
    service.confirmPasswordReset('+6781234567', '000000', 'new-secure-password'),
    BadRequestException,
  );
  assert.equal(attempts, 2);
});

test('a valid code changes the password and consumes the reset token', async () => {
  let updatedPasswordHash;
  let tokenConsumed = false;
  const resetToken = {
    id: 'reset-1',
    codeHash: resetHash('user-1', '012345'),
    expiresAt: new Date(Date.now() + 60_000),
    attempts: 0,
  };
  const service = new AuthService(
    {
      user: { findUnique: async () => ({ id: 'user-1' }) },
      passwordResetToken: {
        findFirst: async () => resetToken,
      },
      $transaction: async (callback) =>
        callback({
          passwordResetToken: {
            findFirst: async () => resetToken,
            deleteMany: async () => {
              tokenConsumed = true;
              return { count: 1 };
            },
          },
          user: {
            update: async ({ data }) => {
              updatedPasswordHash = data.passwordHash;
            },
          },
        }),
    },
    {},
    { getOrThrow: () => jwtSecret },
    {},
  );

  const result = await service.confirmPasswordReset(
    '+6781234567',
    '012345',
    'new-secure-password',
  );

  assert.match(result.message, /reset/);
  assert.equal(tokenConsumed, true);
  assert.equal(await bcrypt.compare('new-secure-password', updatedPasswordHash), true);
});
