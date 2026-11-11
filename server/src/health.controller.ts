import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'vanuatu-transport-api',
        dependencies: { database: 'ok' },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Database health check failed.', error instanceof Error ? error.stack : undefined);
      throw new ServiceUnavailableException('A required service is unavailable.');
    }
  }
}