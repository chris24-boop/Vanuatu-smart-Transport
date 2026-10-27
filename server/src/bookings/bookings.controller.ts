import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller()
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly jwt: JwtService,
  ) {}

  @Post('bookings')
  async createBooking(
    @Headers('authorization') authorization: string | undefined,
    @Body() input: CreateBookingDto,
  ) {
    const user = await this.getIdentity(authorization);
    return this.bookingsService.createBooking(user.sub, input);
  }

  @Get('bookings/my')
  async getMyBookings(@Headers('authorization') authorization: string | undefined) {
    const user = await this.getIdentity(authorization);
    return this.bookingsService.getMyBookings(user.sub);
  }

  @Get('bookings/driver')
  async getDriverBookings(@Headers('authorization') authorization: string | undefined) {
    const user = await this.getIdentity(authorization);
    return this.bookingsService.getDriverBookings(user.sub);
  }

  @Get('bookings/available-services')
  async getAvailableServices() {
    return this.bookingsService.getAvailableServices();
  }

  @Patch('bookings/:id/status')
  async updateStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' },
  ) {
    const user = await this.getIdentity(authorization);
    return this.bookingsService.updateBookingStatus(user.sub, id, body.status);
  }

  @Delete('bookings/:id')
  async cancelBooking(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const user = await this.getIdentity(authorization);
    return this.bookingsService.cancelBooking(user.sub, id);
  }

  @Post('bookings/:id/rate')
  async rateBooking(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    const user = await this.getIdentity(authorization);
    return this.bookingsService.rateBooking(user.sub, id, Number(body.rating), body.comment);
  }

  @Patch('driver/availability')
  async setAvailability(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { status: 'AVAILABLE' | 'ON_TRIP' | 'NOT_AVAILABLE' },
  ) {
    const user = await this.getIdentity(authorization);
    return this.bookingsService.setDriverAvailability(user.sub, body?.status);
  }

  @Get('driver/availability')
  async getAvailability(@Headers('authorization') authorization: string | undefined) {
    const user = await this.getIdentity(authorization);
    return this.bookingsService.getDriverAvailability(user.sub);
  }

  @Post('driver/location')
  async updateDriverLocation(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { driverId?: string; latitude: number; longitude: number },
  ) {
    let driverId = body.driverId;
    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(
          authorization.slice('Bearer '.length),
        );
        if (payload?.sub) driverId = payload.sub;
      } catch {
        // Fall back to body.driverId if token invalid
      }
    }
    return this.bookingsService.updateDriverLocation(
      driverId || '',
      Number(body.latitude),
      Number(body.longitude),
    );
  }

  private async getIdentity(authorization: string | undefined) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication is required.');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        authorization.slice('Bearer '.length),
      );
      if (!payload.sub) {
        throw new UnauthorizedException('Invalid authentication token.');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
