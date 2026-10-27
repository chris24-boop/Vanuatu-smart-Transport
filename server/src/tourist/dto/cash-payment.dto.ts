import { Type } from 'class-transformer';
import { CashPaymentStatus } from '@prisma/client';
import { IsEnum, IsNumber, Max, Min } from 'class-validator';

export class CashPaymentDto {
  @IsEnum(CashPaymentStatus)
  status!: CashPaymentStatus;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000000)
  paidAmount!: number;
}
