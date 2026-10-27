import { IsString, MinLength } from 'class-validator';

export class VerifyTouristRequestDto {
  @IsString()
  @MinLength(32)
  accessToken!: string;
}
