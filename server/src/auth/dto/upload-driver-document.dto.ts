import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class UploadDriverDocumentDto {
  @IsIn(['LICENCE', 'VEHICLE_REGISTRATION', 'INSURANCE'])
  type!: 'LICENCE' | 'VEHICLE_REGISTRATION' | 'INSURANCE';

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  filename!: string;

  @IsIn(['application/pdf', 'image/jpeg', 'image/png'])
  mimeType!: 'application/pdf' | 'image/jpeg' | 'image/png';

  @IsString()
  @MinLength(1)
  contentBase64!: string;
}

