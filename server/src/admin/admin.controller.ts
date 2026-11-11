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
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';

const DOCUMENT_METADATA = {
  id: true,
  type: true,
  filename: true,
  mimeType: true,
  status: true,
  reviewReason: true,
  reviewedAt: true,
  createdAt: true,
} as const;

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
      include: {
        driver: {
          include: {
            documents: {
              select: DOCUMENT_METADATA,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        vehicles: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      const vehicle = user.vehicles[0];
      const vehicleType = vehicle?.vehicleType === 'CAR'
        ? 'PUBLIC_TRANSPORT'
        : vehicle?.vehicleType === 'MINIBUS'
          ? 'BUS'
          : vehicle?.vehicleType ?? 'BUS';

      return {
        id: user.id,
        userId: user.id,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        phone: user.phone,
        email: user.email ?? '',
        licenceNumber: user.driver?.licenceNumber ?? '',
        licenceExpiry: user.driver?.licenceExpiry?.toISOString() ?? '',
        vehicleType,
        vehiclePlate: vehicle?.registrationNumber ?? '',
        vehicleModel: vehicle?.model ?? '',
        island: user.driver?.island ?? '',
        yearsExperience: user.driver?.yearsExperience ?? null,
        verificationStatus: user.driver?.verificationStatus ?? 'REGISTERED',
        rejectionReason: user.driver?.rejectionReason ?? null,
        suspensionReason: user.driver?.suspensionReason ?? null,
        reviewedAt: user.driver?.reviewedAt?.toISOString() ?? null,
        appliedDate: user.createdAt.toISOString(),
        documents: user.driver?.documents ?? [],
      };
    });
  }

  @Patch('drivers/:userId/verify')
  async verifyDriver(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
  ) {
    const admin = await this.requireAdmin(authorization);
    const driver = await this.findDriver(userId);
    const newestDocumentByType = new Map<string, string>();
    for (const document of driver.documents) {
      if (!newestDocumentByType.has(document.type)) {
        newestDocumentByType.set(document.type, document.status);
      }
    }
    const approvedTypes = new Set(
      [...newestDocumentByType]
        .filter(([, status]) => status === 'APPROVED')
        .map(([type]) => type),
    );
    if (!approvedTypes.has('LICENCE') || !approvedTypes.has('VEHICLE_REGISTRATION')) {
      throw new BadRequestException(
        'Approve a driver licence and vehicle registration document before verifying this driver.',
      );
    }

    const reviewedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.driver.update({
        where: { id: driver.id },
        data: {
          verificationStatus: 'VERIFIED',
          rejectionReason: null,
          suspensionReason: null,
          reviewedAt,
          reviewedById: admin.sub,
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorId: admin.sub,
          action: 'DRIVER_VERIFIED',
          entity: 'DRIVER',
          entityId: userId,
          details: { name: `${driver.user.firstName} ${driver.user.lastName}`.trim() },
        },
      });
    });

    return {
      success: true,
      message: `${driver.user.firstName} ${driver.user.lastName} has been verified.`,
    };
  }

  @Patch('drivers/:userId/suspend')
  async suspendDriver(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    const admin = await this.requireAdmin(authorization);
    const driver = await this.findDriver(userId);
    const reason = body.reason?.trim();
    if (!reason) throw new BadRequestException('A suspension reason is required.');

    const reviewedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.driver.update({
        where: { id: driver.id },
        data: {
          verificationStatus: 'SUSPENDED',
          suspensionReason: reason,
          reviewedAt,
          reviewedById: admin.sub,
          availability: 'NOT_AVAILABLE',
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorId: admin.sub,
          action: 'DRIVER_SUSPENDED',
          entity: 'DRIVER',
          entityId: userId,
          details: { reason },
        },
      });
    });

    return { success: true, message: `${driver.user.firstName} ${driver.user.lastName} has been suspended.` };
  }

  @Patch('drivers/:userId/reject')
  async rejectDriver(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
    @Body() body: { reason?: string },
  ) {
    const admin = await this.requireAdmin(authorization);
    const driver = await this.findDriver(userId);
    const reason = body.reason?.trim();
    if (!reason) throw new BadRequestException('A rejection reason is required.');

    const reviewedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.driver.update({
        where: { id: driver.id },
        data: {
          verificationStatus: 'REJECTED',
          rejectionReason: reason,
          suspensionReason: null,
          reviewedAt,
          reviewedById: admin.sub,
          availability: 'NOT_AVAILABLE',
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorId: admin.sub,
          action: 'DRIVER_REJECTED',
          entity: 'DRIVER',
          entityId: userId,
          details: { reason },
        },
      });
    });

    return { success: true, message: `${driver.user.firstName} ${driver.user.lastName} was rejected.` };
  }

  @Get('drivers/:userId/documents/:documentId')
  async getDriverDocument(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    await this.requireAdmin(authorization);
    const document = await this.prisma.driverDocument.findFirst({
      where: { id: documentId, driver: { userId } },
      select: { filename: true, mimeType: true, content: true },
    });
    if (!document) throw new NotFoundException('Driver document not found.');

    response.setHeader('Content-Type', document.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
    );
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(Buffer.from(document.content));
  }

  @Patch('drivers/:userId/documents/:documentId')
  async reviewDriverDocument(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
    @Param('documentId') documentId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    const admin = await this.requireAdmin(authorization);
    if (!['APPROVED', 'REJECTED'].includes(body.status)) {
      throw new BadRequestException('Choose APPROVED or REJECTED for this document.');
    }
    const reason = body.reason?.trim() || null;
    if (body.status === 'REJECTED' && !reason) {
      throw new BadRequestException('A reason is required when rejecting a document.');
    }

    const document = await this.prisma.driverDocument.findFirst({
      where: { id: documentId, driver: { userId } },
      select: { id: true, type: true, status: true },
    });
    if (!document) throw new NotFoundException('Driver document not found.');

    const reviewedAt = new Date();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.driverDocument.update({
        where: { id: document.id },
        data: {
          status: body.status,
          reviewReason: reason,
          reviewedAt,
          reviewedById: admin.sub,
        },
      });
      await transaction.adminAuditLog.create({
        data: {
          actorId: admin.sub,
          action: body.status === 'APPROVED' ? 'DRIVER_DOCUMENT_APPROVED' : 'DRIVER_DOCUMENT_REJECTED',
          entity: 'DRIVER_DOCUMENT',
          entityId: document.id,
          details: { userId, type: document.type, reason },
        },
      });
    });

    return { success: true, status: body.status };
  }

  @Get('activity')
  async getActivity(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const entries = await this.prisma.adminAuditLog.findMany({
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      details: entry.details,
      createdAt: entry.createdAt.toISOString(),
      actorName: `${entry.actor.firstName} ${entry.actor.lastName}`.trim(),
      actorEmail: entry.actor.email,
    }));
  }

  @Get('operations/live')
  async getLiveOperations(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const trips = await this.prisma.trip.findMany({
      where: {
        status: 'ACTIVE',
        currentLatitude: { not: null },
        currentLongitude: { not: null },
      },
      select: {
        id: true,
        currentLatitude: true,
        currentLongitude: true,
        locationUpdatedAt: true,
        route: { select: { origin: true, destination: true } },
        driver: { select: { firstName: true, lastName: true, phone: true } },
        vehicle: { select: { registrationNumber: true, vehicleType: true } },
      },
      orderBy: { locationUpdatedAt: 'desc' },
    });
    return trips.map((trip) => ({
      id: trip.id,
      latitude: Number(trip.currentLatitude),
      longitude: Number(trip.currentLongitude),
      updatedAt: trip.locationUpdatedAt?.toISOString() ?? null,
      driverName: `${trip.driver.firstName} ${trip.driver.lastName}`.trim(),
      driverPhone: trip.driver.phone,
      vehiclePlate: trip.vehicle.registrationNumber,
      vehicleType: trip.vehicle.vehicleType,
      origin: trip.route.origin,
      destination: trip.route.destination,
    }));
  }

  private async findDriver(userId: string) {
    if (!userId.trim()) throw new BadRequestException('Invalid driver id.');

    const driver = await this.prisma.driver.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        documents: {
          select: { type: true, status: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!driver) throw new NotFoundException('Driver not found.');
    return driver;
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
      throw new ForbiddenException('Only transport administrators can access this resource.');
    }
    return payload;
  }
}
