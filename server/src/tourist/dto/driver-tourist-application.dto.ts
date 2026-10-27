import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TouristServiceType } from '@prisma/client';

class TouristVehicleCapacityDto {
  @IsString()
  @MinLength(1)
  vehicleId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  passengerCapacity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  luggageCapacity!: number;
}

export class DriverTouristApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  serviceArea!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  languages!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  vehicleIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsEnum(TouristServiceType, { each: true })
  serviceTypes!: TouristServiceType[];

  @IsString()
  @MinLength(2)
  @MaxLength(500)
  pricingDescription!: string;

  @IsDateString()
  availableFrom!: string;

  @IsDateString()
  availableUntil!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TouristVehicleCapacityDto)
  vehicleCapacities!: TouristVehicleCapacityDto[];
}
