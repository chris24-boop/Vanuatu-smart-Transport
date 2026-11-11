import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Get()
  async list(@Headers('authorization') authorization?: string) {
    const user = await this.getIdentity(authorization);
    const [items, unreadCount] = await Promise.all([
      (this.prisma as any).userNotification.findMany({
        where: { userId: user.sub },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      (this.prisma as any).userNotification.count({ where: { userId: user.sub, readAt: null } }),
    ]);
    return {
      items: items.map((item: {
        id: string;
        title: string;
        body: string;
        type: string;
        entityId: string | null;
        readAt: Date | null;
        createdAt: Date;
      }) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        type: item.type,
        entityId: item.entityId,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      unreadCount,
    };
  }

  @Patch(':id/read')
  async markRead(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const user = await this.getIdentity(authorization);
    const result = await (this.prisma as any).userNotification.updateMany({
      where: { id, userId: user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    if (result.count === 0) {
      const notification = await (this.prisma as any).userNotification.findFirst({
        where: { id, userId: user.sub },
        select: { id: true },
      });
      if (!notification) throw new NotFoundException('Notification not found.');
    }
    return { success: true };
  }

  @Patch('read-all')
  async markAllRead(@Headers('authorization') authorization?: string) {
    const user = await this.getIdentity(authorization);
    const result = await (this.prisma as any).userNotification.updateMany({
      where: { userId: user.sub, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true, updated: result.count };
  }

  private async getIdentity(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication is required.');
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; role: string }>(
        authorization.slice('Bearer '.length),
      );
      if (!payload.sub) throw new UnauthorizedException('Invalid authentication token.');
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }
}
