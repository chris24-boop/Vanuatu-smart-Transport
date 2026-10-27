import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { IncidentsModule } from '../incidents/incidents.module';

@Module({
  imports: [AuthModule, IncidentsModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
  exports: [BookingsService],
})
export class BookingsModule {}
