import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { TouristController } from './tourist.controller';
import { TouristService } from './tourist.service';

@Module({
  imports: [AuthModule],
  controllers: [TouristController],
  providers: [TouristService, PrismaService],
})
export class TouristModule {}
