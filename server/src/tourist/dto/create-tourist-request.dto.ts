import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TouristServiceType } from '@prisma/client';

export class CreateTouristRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  requesterName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(32)
  contactPhone!: string;

  @IsEnum(TouristServiceType)
  serviceType!: TouristServiceType;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  pickupLocation!: string;

  @IsDateString()
  travelAt!: string;

  @IsInt()
  @Min(1)
  @Max(30)
  passengerCount!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  luggageCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  flightNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  cruiseShipName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequests?: string;

  @IsString()
  @MinLength(1)
  driverId!: string;

  @IsString()
  @MinLength(1)
  vehicleId!: string;

  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  stops!: string[];
}
