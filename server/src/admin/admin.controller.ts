import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Get('drivers')
  async getDrivers(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);

    const users = await this.prisma.user.findMany({
      where: { role: 'DRIVER' },
      include: { driver: true, vehicles: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      const v = user.vehicles?.[0];
      const storedType = v?.vehicleType || 'BUS';
      const displayType = storedType === 'CAR' || v?.model?.toLowerCase().includes('camion')
        ? 'PUBLIC_TRANSPORT'
        : storedType === 'MINIBUS'
          ? 'BUS'
          : storedType;

      return {
        id: String(user.id),
        userId: String(user.id),
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        phone: user.phone,
        email: user.email ?? '',
        licenceNumber: user.driver?.licenceNumber ?? 'N/A',
        licenceExpiry: user.driver?.licenceExpiry
          ? new Date(user.driver.licenceExpiry).toISOString()
          : '',
        vehicleType: displayType,
        vehiclePlate: v?.registrationNumber || 'Pending Plate',
        vehicleModel: v?.model || 'Standard Transport',
        island: 'Port Vila',
        yearsExperience: 0,
        verificationStatus: user.driver?.verificationStatus ?? 'REGISTERED',
        appliedDate: new Date(user.createdAt).toLocaleString(),
      };
    });
  }

  @Patch('drivers/:userId/verify')
  async verifyDriver(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
  ) {
    await this.requireAdmin(authorization);

    if (!userId.trim()) {
      throw new BadRequestException('Invalid driver id.');
    }

    const user = (await this.prisma.user.findUnique({
      where: { id: userId as any },
      include: { driver: true },
    })) as any;

    if (!user || user.role !== 'DRIVER') {
      throw new NotFoundException('Driver not found.');
    }

    if (!user.driver) {
      throw new NotFoundException('Driver profile not found.');
    }

    await this.prisma.driver.update({
      where: { userId: String(user.id) },
      data: { verificationStatus: 'VERIFIED' },
    });

    return {
      success: true,
      message: `${user.firstName} ${user.lastName} has been approved as a verified driver.`,
    };
  }

  @Patch('drivers/:userId/suspend')
  async suspendDriver(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
  ) {
    await this.requireAdmin(authorization);

    if (!userId.trim()) {
      throw new BadRequestException('Invalid driver id.');
    }

    const user = (await this.prisma.user.findUnique({
      where: { id: userId as any },
      include: { driver: true },
    })) as any;

    if (!user || user.role !== 'DRIVER') {
      throw new NotFoundException('Driver not found.');
    }

    if (!user.driver) {
      throw new NotFoundException('Driver profile not found.');
    }

    await this.prisma.driver.update({
      where: { userId: String(user.id) },
      data: { verificationStatus: 'SUSPENDED' },
    });

    return {
      success: true,
      message: `${user.firstName} ${user.lastName} has been suspended.`,
    };
  }

  @Patch('drivers/:userId/reject')
  async rejectDriver(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    await this.requireAdmin(authorization);

    if (!userId.trim()) {
      throw new BadRequestException('Invalid driver id.');
    }

    const user = (await this.prisma.user.findUnique({
      where: { id: userId as any },
      include: { driver: true },
    })) as any;

    if (!user || user.role !== 'DRIVER') {
      throw new NotFoundException('Driver not found.');
    }

    if (!user.driver) {
      throw new NotFoundException('Driver profile not found.');
    }

    await this.prisma.driver.update({
      where: { userId: String(user.id) },
      data: { verificationStatus: 'SUSPENDED' },
    });

    const reasonText = body?.reason?.trim() || 'No reason provided';

    return {
      success: true,
      message: `${user.firstName} ${user.lastName} was rejected. Reason: ${reasonText}`,
    };
  }

  private async requireAdmin(authorization: string | undefined) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication is required.');
    }

    let payload: { sub: string; role: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        authorization.slice('Bearer '.length),
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }

    if (!payload.sub || payload.role !== 'ADMIN') {
      throw new ForbiddenException('Only transport administrators can manage drivers.');
    }
  }
}
