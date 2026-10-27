import { IsString, MinLength } from 'class-validator';

export class RequestPasswordResetDto {
  @IsString()
  @MinLength(5)
  phone!: string;
}
