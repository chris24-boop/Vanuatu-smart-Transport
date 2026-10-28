import { Module } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsGatewayService } from './sms-gateway.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: createHmac('sha256', config.getOrThrow<string>('JWT_SECRET'))
          .update('vanuatu-smart-transport:access-token-signing-key')
          .digest('hex'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, SmsGatewayService],
  exports: [JwtModule],
})
export class AuthModule {}