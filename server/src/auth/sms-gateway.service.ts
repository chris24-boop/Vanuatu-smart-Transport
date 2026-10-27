import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsGatewayService {
  private readonly logger = new Logger(SmsGatewayService.name);

  constructor(private readonly config: ConfigService) {}

  async sendSms(to: string, message: string): Promise<void> {
    const url = this.config.get<string>('SMS_GATEWAY_URL');
    const apiKey = this.config.get<string>('SMS_GATEWAY_API_KEY');

    if (!url || !apiKey) {
      throw new ServiceUnavailableException('Password recovery SMS is not configured.');
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, message }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      this.logger.error(
        `SMS gateway request failed: ${error instanceof Error ? error.message : 'Unknown network error'}`,
      );
      throw new ServiceUnavailableException('Unable to send the password recovery SMS.');
    }

    if (!response.ok) {
      this.logger.error(`SMS gateway returned HTTP ${response.status}.`);
      throw new ServiceUnavailableException('Unable to send the password recovery SMS.');
    }
  }
}
