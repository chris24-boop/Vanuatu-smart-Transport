import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTouristQuoteDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(100000000)
  amount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  @Max(24)
  durationHours!: number;

  @IsDateString()
  expiresAt!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  includedServices!: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  excludedServices!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  waitingTerms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cancellationTerms?: string;
}
