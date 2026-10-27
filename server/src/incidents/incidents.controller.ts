import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IncidentsService } from './incidents.service';

@Controller('incidents')
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly jwt: JwtService,
  ) {}

  @Post()
  async reportIncident(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: {
      tripId?: string;
      category: string;
      description: string;
      vehiclePlate?: string;
      driverName?: string;
      location?: string;
      reporterPhone?: string;
    },
  ) {
    let reporterId = 'anonymous';
    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(
          authorization.slice('Bearer '.length),
        );
        if (payload?.sub) reporterId = payload.sub;
      } catch {
        // Fall back to anonymous reporter
      }
    }

    return this.incidentsService.createIncident({
      reporterId,
      tripId: body.tripId,
      category: body.category,
      description: body.description,
      vehiclePlate: body.vehiclePlate,
      driverName: body.driverName,
      location: body.location,
      reporterPhone: body.reporterPhone,
    });
  }

  @Get()
  async listIncidents(
    @Headers('authorization') authorization: string | undefined,
    @Query('status') status?: string,
  ) {
    await this.requireAdmin(authorization);
    return this.incidentsService.listIncidents(status);
  }

  @Patch(':id/status')
  async updateIncidentStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' },
  ) {
    await this.requireAdmin(authorization);
    return this.incidentsService.updateIncidentStatus(id, body.status);
  }

  private async requireAdmin(authorization: string | undefined) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication is required.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        authorization.slice('Bearer '.length),
      );
      if (payload.role !== 'ADMIN') {
        throw new UnauthorizedException('Only transport administrators can review incident reports.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
