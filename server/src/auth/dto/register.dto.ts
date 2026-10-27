import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsString()
  @MinLength(5)
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  licenceNumber?: string;

  @IsOptional()
  @IsString()
  @IsIn(['TAXI', 'BUS', 'PUBLIC_TRANSPORT'])
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehiclePlate?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  island?: string;
}