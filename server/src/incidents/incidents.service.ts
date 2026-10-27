import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateIncidentInput {
  reporterId: string;
  tripId?: string;
  category: string;
  description: string;
  vehiclePlate?: string;
  driverName?: string;
  location?: string;
  reporterPhone?: string;
}

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createIncident(input: CreateIncidentInput) {
    if (!input.category || !input.description) {
      throw new BadRequestException('Category and description are required.');
    }

    const payload = {
      details: input.description.trim(),
      vehiclePlate: input.vehiclePlate?.trim() || 'N/A',
      driverName: input.driverName?.trim() || 'N/A',
      location: input.location?.trim() || 'Vanuatu',
      reporterPhone: input.reporterPhone?.trim() || '',
    };

    const incident = await this.prisma.incident.create({
      data: {
        reporterId: input.reporterId || 'anonymous',
        tripId: input.tripId || null,
        category: input.category,
        description: JSON.stringify(payload),
        status: 'OPEN',
      },
    });

    return this.toIncidentResponse(incident);
  }

  async listIncidents(status?: string) {
    const where: any = {
      category: { not: 'DRIVER_RATING' },
    };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const incidents = await this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return incidents.map((item) => this.toIncidentResponse(item));
  }

  async updateIncidentStatus(id: string, status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED') {
    const updated = await this.prisma.incident.update({
      where: { id },
      data: { status },
    });
    return this.toIncidentResponse(updated);
  }

  // Driver Ratings stored persistently in incidents table
  async rateDriver(passengerId: string, bookingId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5 stars.');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { driver: true, passenger: true },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found.');
    }

    const payload = {
      driverId: booking.driverId,
      bookingId: booking.id,
      passengerId,
      passengerName: booking.passenger ? `${booking.passenger.firstName} ${booking.passenger.lastName}`.trim() : 'Passenger',
      rating,
      comment: comment?.trim() || '',
    };

    await this.prisma.incident.create({
      data: {
        reporterId: passengerId,
        tripId: bookingId,
        category: 'DRIVER_RATING',
        description: JSON.stringify(payload),
        status: 'RATED',
      },
    });

    return {
      success: true,
      message: 'Thank you for rating your driver / Tankyu tumas long mak we yu givim!',
      rating,
    };
  }

  async getDriverRating(driverId: string): Promise<{ averageRating: number; totalRatings: number }> {
    const ratings = await this.prisma.incident.findMany({
      where: { category: 'DRIVER_RATING' },
    });

    const driverRatings: number[] = [];
    for (const item of ratings) {
      try {
        const data = JSON.parse(item.description);
        if (data.driverId === driverId && typeof data.rating === 'number') {
          driverRatings.push(data.rating);
        }
      } catch {
        // Ignore unparseable
      }
    }

    if (driverRatings.length === 0) {
      return { averageRating: 5.0, totalRatings: 0 };
    }

    const sum = driverRatings.reduce((acc, curr) => acc + curr, 0);
    const average = Math.round((sum / driverRatings.length) * 10) / 10;
    return { averageRating: average, totalRatings: driverRatings.length };
  }

  private toIncidentResponse(incident: any) {
    let details = incident.description;
    let vehiclePlate = 'N/A';
    let driverName = 'N/A';
    let location = 'Vanuatu';
    let reporterPhone = '';

    try {
      const parsed = JSON.parse(incident.description);
      details = parsed.details || incident.description;
      vehiclePlate = parsed.vehiclePlate || 'N/A';
      driverName = parsed.driverName || 'N/A';
      location = parsed.location || 'Vanuatu';
      reporterPhone = parsed.reporterPhone || '';
    } catch {
      // Raw string fallback
    }

    return {
      id: incident.id,
      reporterId: incident.reporterId,
      tripId: incident.tripId,
      category: incident.category,
      description: details,
      vehiclePlate,
      driverName,
      location,
      reporterPhone,
      status: incident.status,
      createdAt: new Date(incident.createdAt).toISOString(),
    };
  }
}
