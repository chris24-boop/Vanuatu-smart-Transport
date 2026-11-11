const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const { HealthController } = require('../dist/src/health.controller');

test('health endpoint reports database dependency status', async () => {
  let queries = 0;
  const controller = new HealthController({
    $queryRaw: async () => {
      queries += 1;
    },
  });

  const result = await controller.getHealth();
  assert.equal(queries, 1);
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.dependencies, { database: 'ok' });
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
});

test('health endpoint fails when the database query fails', async () => {
  const controller = new HealthController({
    $queryRaw: async () => {
      throw new Error('database unavailable');
    },
  });

  await assert.rejects(controller.getHealth(), ServiceUnavailableException);
});
