import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { CashPaymentDto } from './dto/cash-payment.dto';
import { ConfirmTouristQuoteDto } from './dto/confirm-tourist-quote.dto';
import { CreateTouristQuoteDto } from './dto/create-tourist-quote.dto';
import { CreateTouristRequestDto } from './dto/create-tourist-request.dto';
import { DriverTouristApplicationDto } from './dto/driver-tourist-application.dto';
import { UpdateTouristDestinationDto } from './dto/update-tourist-destination.dto';
import { VerifyTouristRequestDto } from './dto/verify-tourist-request.dto';
import { TouristService } from './tourist.service';

type Identity = { sub: string; role: string };

@Controller('tourist')
export class TouristController {
  constructor(
    private readonly touristService: TouristService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('services')
  listServices() {
    return this.touristService.listServices();
  }

  @Get('destinations')
  listDestinations() {
    return this.touristService.listDestinations();
  }

  @Get('drivers')
  listDrivers() {
    return this.touristService.listDrivers();
  }

  @Get('drivers/:id')
  getDriver(@Param('id') id: string) {
    return this.touristService.getDriver(id);
  }

  @Post('requests')
  async createRequest(
    @Headers('authorization') authorization: string | undefined,
    @Body() input: CreateTouristRequestDto,
  ) {
    const identity = authorization ? await this.verifyIdentity(authorization) : undefined;
    return this.touristService.createRequest(input, identity?.sub);
  }

  @Post('requests/:reference/verify')
  verifyRequest(
    @Param('reference') reference: string,
    @Body() input: VerifyTouristRequestDto,
  ) {
    return this.touristService.getGuestRequest(reference, input.accessToken);
  }

  @Post('requests/:reference/cancel')
  cancelRequest(
    @Param('reference') reference: string,
    @Body() input: VerifyTouristRequestDto,
  ) {
    return this.touristService.cancelGuestRequest(reference, input.accessToken);
  }

  @Get('requests/:reference/quotes')
  listQuotes(
    @Param('reference') reference: string,
    @Headers('x-tourist-access-token') accessToken?: string,
  ) {
    if (!accessToken) throw new UnauthorizedException('Guest access token is required.');
    return this.touristService.listGuestQuotes(reference, accessToken);
  }

  @Post('quotes/:id/confirm')
  confirmQuote(@Param('id') id: string, @Body() input: ConfirmTouristQuoteDto) {
    return this.touristService.confirmQuote(id, input.reference, input.accessToken);
  }

  @Get('driver/requests')
  async driverRequests(@Headers('authorization') authorization?: string) {
    const identity = await this.requireRole(authorization, 'DRIVER');
    return this.touristService.listDriverRequests(identity.sub);
  }

  @Get('driver/service-application')
  async getDriverServiceApplication(@Headers('authorization') authorization?: string) {
    const identity = await this.requireRole(authorization, 'DRIVER');
    return this.touristService.getDriverServiceApplication(identity.sub);
  }

  @Post('driver/service-application')
  async applyForTouristService(
    @Headers('authorization') authorization: string | undefined,
    @Body() input: DriverTouristApplicationDto,
  ) {
    const identity = await this.requireRole(authorization, 'DRIVER');
    return this.touristService.applyForTouristService(identity.sub, input);
  }

  @Post('driver/requests/:id/decline')
  async declineRequest(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const identity = await this.requireRole(authorization, 'DRIVER');
    return this.touristService.declineRequest(identity.sub, id);
  }

  @Post('driver/requests/:id/quote')
  async createQuote(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() input: CreateTouristQuoteDto,
  ) {
    const identity = await this.requireRole(authorization, 'DRIVER');
    return this.touristService.createQuote(identity.sub, id, input);
  }

  @Get('driver/bookings')
  async driverBookings(@Headers('authorization') authorization?: string) {
    const identity = await this.requireRole(authorization, 'DRIVER');
    return this.touristService.listDriverBookings(identity.sub);
  }

  @Patch('driver/bookings/:id/status')
  async updateBookingStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body('status') status: 'IN_PROGRESS' | 'COMPLETED',
  ) {
    if (status !== 'IN_PROGRESS' && status !== 'COMPLETED') {
      throw new ForbiddenException('Tour status transition is not allowed.');
    }
    const identity = await this.requireRole(authorization, 'DRIVER');
    return this.touristService.updateBookingStatus(identity.sub, id, status);
  }

  @Patch('driver/bookings/:id/cash-payment')
  async recordCashPayment(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() input: CashPaymentDto,
  ) {
    const identity = await this.requireRole(authorization, 'DRIVER');
    return this.touristService.recordCashPayment(
      identity.sub,
      id,
      input.status,
      input.paidAmount,
    );
  }

  @Post('admin/destinations')
  async createDestination(
    @Headers('authorization') authorization: string | undefined,
    @Body() input: UpdateTouristDestinationDto,
  ) {
    await this.requireRole(authorization, 'ADMIN');
    return this.prisma.touristDestination.create({
      data: {
        name: input.name.trim(),
        island: input.island.trim(),
        description: input.description?.trim(),
        active: input.active ?? true,
      },
    });
  }

  @Get('admin/destinations')
  async listAdminDestinations(@Headers('authorization') authorization?: string) {
    await this.requireRole(authorization, 'ADMIN');
    return this.touristService.listAdminDestinations();
  }

  @Patch('admin/destinations/:id')
  async updateDestination(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() input: UpdateTouristDestinationDto,
  ) {
    await this.requireRole(authorization, 'ADMIN');
    return this.prisma.touristDestination.update({
      where: { id },
      data: {
        name: input.name.trim(),
        island: input.island.trim(),
        description: input.description?.trim(),
        active: input.active,
      },
    });
  }

  private async requireRole(authorization: string | undefined, role: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication is required.');
    }
    const identity = await this.verifyIdentity(authorization);
    if (identity.role !== role) {
      throw new ForbiddenException(`A ${role.toLowerCase()} account is required.`);
    }
    return identity;
  }

  private async verifyIdentity(authorization: string): Promise<Identity> {
    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication is required.');
    }
    try {
      const payload = await this.jwt.verifyAsync<Identity>(
        authorization.slice('Bearer '.length),
      );
      if (!payload.sub || !payload.role) {
        throw new UnauthorizedException('Invalid authentication token.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
