import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsString()
  @IsNotEmpty()
  pickupLocation!: string;

  @IsString()
  @IsNotEmpty()
  dropoffLocation!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  seatsCount?: number;

  @IsOptional()
  @IsString()
  cargoNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fare?: number;
}
