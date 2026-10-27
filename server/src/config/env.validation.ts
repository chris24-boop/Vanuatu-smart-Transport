export function validateEnvironment(config: Record<string, unknown>) {
  const databaseUrl = config.DATABASE_URL;
  const jwtSecret = config.JWT_SECRET;
  const nodeEnvironment = config.NODE_ENV;
  const clientOrigin = config.CLIENT_ORIGIN;
  const smsGatewayUrl = config.SMS_GATEWAY_URL;
  const smsGatewayApiKey = config.SMS_GATEWAY_API_KEY;

  if (typeof databaseUrl !== 'string' || databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL must be configured.');
  }

  if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  if (/replace|change-me|development-secret|example/i.test(jwtSecret)) {
    throw new Error('JWT_SECRET must be replaced with a private random secret.');
  }

  if ((smsGatewayUrl && !smsGatewayApiKey) || (!smsGatewayUrl && smsGatewayApiKey)) {
    throw new Error('SMS_GATEWAY_URL and SMS_GATEWAY_API_KEY must be configured together.');
  }

  if (nodeEnvironment === 'production') {
    if (!smsGatewayUrl || !smsGatewayApiKey) {
      throw new Error('SMS_GATEWAY_URL and SMS_GATEWAY_API_KEY are required in production.');
    }
    if (clientOrigin === '*' || typeof clientOrigin !== 'string' || !clientOrigin.trim()) {
      throw new Error('CLIENT_ORIGIN must be explicitly configured in production.');
    }
  }

  if (smsGatewayUrl && typeof smsGatewayUrl === 'string') {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(smsGatewayUrl);
    } catch {
      throw new Error('SMS_GATEWAY_URL must be a valid URL.');
    }
    if (nodeEnvironment === 'production' && parsedUrl.protocol !== 'https:') {
      throw new Error('SMS_GATEWAY_URL must use HTTPS in production.');
    }
  }

  return config;
}
