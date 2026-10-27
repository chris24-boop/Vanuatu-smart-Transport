import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, PrismaService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
