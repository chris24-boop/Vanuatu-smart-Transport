const assert = require('node:assert/strict');
const { createHash, createHmac } = require('node:crypto');
const { test } = require('node:test');
const { JwtService } = require('@nestjs/jwt');
const { UnauthorizedException } = require('@nestjs/common');
const { AuthService } = require('../dist/src/auth/auth.service');

const jwtSecret = 'test-secret-value-with-more-than-32-characters';
const refreshSecret = createHmac('sha256', jwtSecret)
  .update('vanuatu-smart-transport:refresh-token-signing-key')
  .digest('hex');
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

async function createRefreshFixture() {
  const jwt = new JwtService({ secret: jwtSecret });
  const oldTokenId = 'refresh-session-1';
  const oldToken = await jwt.signAsync(
    { sub: 'user-1', role: 'PASSENGER', type: 'refresh', jti: oldTokenId },
    { secret: refreshSecret, expiresIn: '30d' },
  );
  const session = {
    id: oldTokenId,
    userId: 'user-1',
    tokenHash: hashToken(oldToken),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: 'user-1',
      role: 'PASSENGER',
      firstName: 'Test',
      lastName: 'Passenger',
      phone: '+6780000000',
      email: 'test@example.test',
      driver: null,
      vehicles: [],
    },
  };
  let newSession;
  const prisma = {
    refreshToken: {
      findUnique: async () => session,
      updateMany: async () => ({ count: 0 }),
    },
    $transaction: async (operation) =>
      operation({
        refreshToken: {
          updateMany: async ({ where, data }) => {
            if (session.revokedAt || session.tokenHash !== where.tokenHash) {
              return { count: 0 };
            }
            session.revokedAt = data.revokedAt;
            return { count: 1 };
          },
          create: async ({ data }) => {
            newSession = data;
            return data;
          },
        },
      }),
  };
  const service = new AuthService(
    prisma,
    jwt,
    { getOrThrow: () => jwtSecret },
    {},
  );
  return {
    service,
    jwt,
    oldToken,
    session,
    getNewSession: () => newSession,
  };
}

test('refresh tokens are separate, short-lived access credentials and rotate once', async () => {
  const { service, jwt, oldToken, session, getNewSession } =
    await createRefreshFixture();
  const response = await service.refreshToken(oldToken);
  const accessPayload = await jwt.verifyAsync(response.accessToken);
  const refreshPayload = await jwt.verifyAsync(response.refreshToken, {
    secret: refreshSecret,
  });

  assert.equal(accessPayload.type, 'access');
  assert.ok(accessPayload.exp - accessPayload.iat <= 15 * 60);
  assert.equal(refreshPayload.type, 'refresh');
  assert.notEqual(response.refreshToken, oldToken);
  assert.ok(session.revokedAt);
  assert.equal(getNewSession().tokenHash, hashToken(response.refreshToken));

  await assert.rejects(service.refreshToken(oldToken), UnauthorizedException);
});

test('refresh tokens cannot be used as access tokens', async () => {
  const { jwt, oldToken } = await createRefreshFixture();
  await assert.rejects(jwt.verifyAsync(oldToken), /signature|secret/i);
});

test('logout revokes the matching refresh-token hash', async () => {
  let update;
  const token = 'refresh-token-to-revoke';
  const service = new AuthService(
    {
      refreshToken: {
        updateMany: async (args) => {
          update = args;
          return { count: 1 };
        },
      },
    },
    {},
    { getOrThrow: () => jwtSecret },
    {},
  );

  assert.deepEqual(await service.revokeRefreshToken(token), { success: true });
  assert.equal(update.where.tokenHash, hashToken(token));
  assert.equal(update.where.revokedAt, null);
});
