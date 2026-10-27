import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SmsGatewayService } from './sms-gateway.service';

@Injectable()
export class AuthService {
  private readonly passwordResetMessage =
    'If an account exists for this phone number, a password reset code will be sent.';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly smsGateway: SmsGatewayService,
  ) {}

  async register(data: RegisterDto) {
    const email = data.email.trim().toLowerCase();
    const phone = data.phone.trim();
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@midriver.com').trim().toLowerCase();

    if (email === adminEmail || email.startsWith('admin@') || email.endsWith('@admin.com')) {
      throw new ForbiddenException(
        'Administrator accounts are strictly pre-seeded and cannot be created via public registration.',
      );
    }

    let assignedRole: 'DRIVER' | 'PASSENGER' = 'PASSENGER';

    if (data.role === 'DRIVER' || email.endsWith('@midriver.com')) {
      assignedRole = 'DRIVER';
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone }, { email }],
      },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address or phone number already exists.');
    }

    // Keep legacy minibus registrations in the bus category.
    let mappedVehicleType: 'BUS' | 'TAXI' | 'PUBLIC_TRANSPORT' = 'BUS';
    if (data.vehicleType === 'TAXI') mappedVehicleType = 'TAXI';
    else if (data.vehicleType === 'BUS') mappedVehicleType = 'BUS';
    else if (data.vehicleType === 'PUBLIC_TRANSPORT') mappedVehicleType = 'PUBLIC_TRANSPORT';

    const vehiclePlate = data.vehiclePlate?.trim() || `VT-${phone.slice(-4)}`;
    const vehicleModel = data.vehicleModel?.trim() || (data.vehicleType === 'TAXI' ? 'Taxi Service' : data.vehicleType === 'BUS' ? 'Public Bus' : 'Public Transport');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone,
        email,
        passwordHash,
        role: assignedRole,
        driver: assignedRole === 'DRIVER' ? {
          create: {
            licenceNumber: data.licenceNumber?.trim() || null,
            verificationStatus: 'PENDING_VERIFICATION',
          },
        } : undefined,
        vehicles: assignedRole === 'DRIVER' ? {
          create: {
            registrationNumber: vehiclePlate,
            vehicleType: mappedVehicleType,
            model: vehicleModel,
            capacity: mappedVehicleType === 'TAXI' ? 4 : 14,
            status: 'ACTIVE',
          },
        } : undefined,
      },
      include: {
        driver: true,
        vehicles: true,
      },
    });

    return this.createAuthResponse(user);
  }

  async login(data: LoginDto) {
    const email = data.email.trim().toLowerCase();

    if (!email) {
      throw new UnauthorizedException('Please enter your email address.');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email,
      },
      include: {
        driver: true,
        vehicles: true,
      },
    });

    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // We do NOT block pending drivers from logging in.
    // They are returned with their verificationStatus so the UI can show their onboarding / pending approval status.
    return this.createAuthResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        driver: true,
        vehicles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found.');
    }

    const v = user.vehicles?.[0];
    const isPublicTransport = v?.vehicleType === 'CAR' || v?.model?.toLowerCase().includes('camion');
    const vehicleTypeDisplay = isPublicTransport
      ? 'PUBLIC_TRANSPORT'
      : v?.vehicleType === 'MINIBUS'
        ? 'BUS'
        : v?.vehicleType;

    return {
      id: String(user.id),
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email ?? '',
      role: user.role,
      driverVerificationStatus: user.driver?.verificationStatus ?? null,
      driverAvailability: user.driver?.availability ?? 'NOT_AVAILABLE',
      licenceNumber: user.driver?.licenceNumber ?? null,
      vehiclePlate: v?.registrationNumber ?? null,
      vehicleType: vehicleTypeDisplay ?? null,
      vehicleModel: v?.model ?? null,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(refreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { driver: true, vehicles: true },
      });
      if (!user) {
        throw new UnauthorizedException('User not found.');
      }
      return this.createAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async requestPasswordReset(phoneInput: string): Promise<{ message: string }> {
    const phone = phoneInput.trim();
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true },
    });

    if (!user) {
      return { message: this.passwordResetMessage };
    }

    const now = new Date();
    const recentToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(now.getTime() - 60_000) },
      },
      select: { id: true },
    });
    if (recentToken) {
      return { message: this.passwordResetMessage };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = this.hashResetCode(user.id, code);
    const expiresAt = new Date(now.getTime() + 10 * 60_000);

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, codeHash, expiresAt },
    });

    await this.smsGateway.sendSms(
      user.phone,
      `Your Vanuatu Smart Transport password reset code is ${code}. It expires in 10 minutes.`,
    );

    return { message: this.passwordResetMessage };
  }

  async confirmPasswordReset(
    phoneInput: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { phone: phoneInput.trim() },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException('The reset code is invalid or expired.');
    }

    const now = new Date();
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gt: now },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!resetToken) {
      throw new BadRequestException('The reset code is invalid or expired.');
    }

    const expectedHash = Buffer.from(resetToken.codeHash, 'hex');
    const providedHash = Buffer.from(this.hashResetCode(user.id, code), 'hex');
    if (
      expectedHash.length !== providedHash.length ||
      !timingSafeEqual(expectedHash, providedHash)
    ) {
      await this.prisma.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          attempts: { lt: 5 },
        },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('The reset code is invalid or expired.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    const resetSucceeded = await this.prisma.$transaction(async (transaction) => {
      const consumed = await transaction.passwordResetToken.deleteMany({
        where: {
          id: resetToken.id,
          expiresAt: { gt: now },
          attempts: { lt: 5 },
        },
      });
      if (consumed.count !== 1) {
        return false;
      }

      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
      return true;
    });

    if (!resetSucceeded) {
      throw new BadRequestException('The reset code is invalid or expired.');
    }

    return { message: 'Your password has been reset. You can now sign in.' };
  }

  private hashResetCode(userId: string, code: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`${userId}:${code}`)
      .digest('hex');
  }

  private async createAuthResponse(user: {
    id: string | number;
    role: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    driver?: { verificationStatus?: string | null; licenceNumber?: string | null; availability?: string | null } | null;
    vehicles?: Array<{ registrationNumber?: string; vehicleType?: string; model?: string | null }> | null;
  }) {
    const accessToken = await this.jwt.signAsync({ sub: String(user.id), role: user.role });
    const v = user.vehicles?.[0];
    const isPublicTransport = v?.vehicleType === 'CAR' || v?.model?.toLowerCase().includes('camion');
    const vehicleTypeDisplay = isPublicTransport
      ? 'PUBLIC_TRANSPORT'
      : v?.vehicleType === 'MINIBUS'
        ? 'BUS'
        : v?.vehicleType;

    return {
      accessToken,
      refreshToken: accessToken,
      user: {
        id: String(user.id),
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email ?? '',
        role: user.role,
        driverVerificationStatus: user.driver?.verificationStatus ?? null,
        driverAvailability: user.driver?.availability ?? 'NOT_AVAILABLE',
        licenceNumber: user.driver?.licenceNumber ?? null,
        vehiclePlate: v?.registrationNumber ?? null,
        vehicleType: vehicleTypeDisplay ?? null,
        vehicleModel: v?.model ?? null,
      },
    };
  }
}