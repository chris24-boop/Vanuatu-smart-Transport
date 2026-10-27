import { IsString, Matches, MinLength } from 'class-validator';

export class ConfirmPasswordResetDto {
  @IsString()
  @MinLength(5)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;

  @IsString()
  @MinLength(12)
  newPassword!: string;
}
