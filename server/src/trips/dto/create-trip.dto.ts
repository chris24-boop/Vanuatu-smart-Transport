import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  origin!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  destination!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  vehiclePlate!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  departureTime!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fare!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalSeats!: number;

  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  stops!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
