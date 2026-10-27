const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateEnvironment } = require('../dist/src/config/env.validation');

const baseConfig = {
  DATABASE_URL: 'postgresql://transport:local-only@localhost:5432/vanuatu_transport',
  JWT_SECRET: 'test-secret-value-with-more-than-32-characters',
};

test('environment validation requires a database URL and strong JWT secret', () => {
  assert.throws(
    () => validateEnvironment({ ...baseConfig, DATABASE_URL: '' }),
    /DATABASE_URL must be configured/,
  );
  assert.throws(
    () => validateEnvironment({ ...baseConfig, JWT_SECRET: 'too-short' }),
    /at least 32 characters/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...baseConfig,
        JWT_SECRET: 'replace-with-a-long-but-still-placeholder-secret',
      }),
    /private random secret/,
  );
});

test('production requires explicit CORS and SMS gateway configuration', () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...baseConfig,
        NODE_ENV: 'production',
        CLIENT_ORIGIN: '*',
        SMS_GATEWAY_URL: 'https://sms.example.test/send',
        SMS_GATEWAY_API_KEY: 'test-key',
      }),
    /CLIENT_ORIGIN/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...baseConfig,
        NODE_ENV: 'production',
        CLIENT_ORIGIN: 'https://app.example.test',
      }),
    /SMS_GATEWAY_URL and SMS_GATEWAY_API_KEY are required/,
  );
});

test('production SMS gateway must use HTTPS and both credentials must be paired', () => {
  assert.throws(
    () =>
      validateEnvironment({
        ...baseConfig,
        NODE_ENV: 'production',
        CLIENT_ORIGIN: 'https://app.example.test',
        SMS_GATEWAY_URL: 'http://sms.example.test/send',
        SMS_GATEWAY_API_KEY: 'test-key',
      }),
    /must use HTTPS/,
  );
  assert.throws(
    () =>
      validateEnvironment({
        ...baseConfig,
        SMS_GATEWAY_URL: 'https://sms.example.test/send',
      }),
    /must be configured together/,
  );
});
