import { IsString, MinLength } from 'class-validator';

export class ConfirmTouristQuoteDto {
  @IsString()
  @MinLength(20)
  reference!: string;

  @IsString()
  @MinLength(32)
  accessToken!: string;
}
