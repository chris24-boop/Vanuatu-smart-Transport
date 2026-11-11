import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { UploadDriverDocumentDto } from './dto/upload-driver-document.dto';

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
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

@Controller('driver/documents')
export class DriverDocumentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Get()
  async list(@Headers('authorization') authorization?: string) {
    const identity = await this.getDriverIdentity(authorization);
    const driver = await this.prisma.driver.findUnique({
      where: { userId: identity.sub },
      include: { documents: { select: DOCUMENT_METADATA, orderBy: { createdAt: 'desc' } } },
    });
    if (!driver) throw new UnauthorizedException('Driver profile not found.');
    return driver.documents;
  }

  @Post()
  async upload(
    @Headers('authorization') authorization: string | undefined,
    @Body() input: UploadDriverDocumentDto,
  ) {
    const identity = await this.getDriverIdentity(authorization);
    const content = Buffer.from(input.contentBase64, 'base64');
    if (
      !content.length ||
      content.length > MAX_DOCUMENT_BYTES ||
      content.toString('base64').replace(/=+$/, '') !== input.contentBase64.replace(/=+$/, '')
    ) {
      throw new BadRequestException('Document must be a valid file no larger than 5 MB.');
    }

    const signatureIsValid =
      input.mimeType === 'application/pdf'
        ? content.subarray(0, 5).toString('ascii') === '%PDF-'
        : input.mimeType === 'image/png'
          ? content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : content.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    if (!signatureIsValid) {
      throw new BadRequestException('The selected file does not match its declared file type.');
    }

    const driver = await this.prisma.driver.findUnique({ where: { userId: identity.sub } });
    if (!driver) throw new UnauthorizedException('Driver profile not found.');

    const document = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.driverDocument.create({
        data: {
          driverId: driver.id,
          type: input.type,
          filename: input.filename.replace(/[\\/]/g, '_').trim(),
          mimeType: input.mimeType,
          content,
        },
        select: DOCUMENT_METADATA,
      });

      if (driver.verificationStatus === 'REJECTED' || driver.verificationStatus === 'VERIFIED') {
        await transaction.driver.update({
          where: { id: driver.id },
          data: {
            verificationStatus: 'PENDING_VERIFICATION',
            availability: 'NOT_AVAILABLE',
            rejectionReason: null,
            suspensionReason: null,
            reviewedAt: null,
            reviewedById: null,
          },
        });
      }

      return created;
    });

    return document;
  }

  private async getDriverIdentity(authorization?: string) {
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

    if (!payload.sub || payload.role !== 'DRIVER') {
      throw new UnauthorizedException('Only drivers can manage their verification documents.');
    }
    return payload;
  }
}
