import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { AdminController } from './admin/admin.controller';
import { TripsController } from './trips/trips.controller';
import { BookingsModule } from './bookings/bookings.module';
import { IncidentsModule } from './incidents/incidents.module';
import { validateEnvironment } from './config/env.validation';
import { TouristModule } from './tourist/tourist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    AuthModule,
    BookingsModule,
    IncidentsModule,
    TouristModule,
  ],
  controllers: [HealthController, AdminController, TripsController],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}