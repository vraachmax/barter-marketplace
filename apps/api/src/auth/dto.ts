import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber(undefined)
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber(undefined)
  phone?: string;

  @IsString()
  password!: string;
}

export class UpdateMeDto {
  /** Пустая строка / пробелы — сброс имени на витрине (см. auth.service trim || null) */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim().length > 0)
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  about?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  companyInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  avatarUrl?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber(undefined)
  phone?: string;

  @IsOptional()
  @IsIn(['SYSTEM', 'LIGHT', 'DARK'])
  appTheme?: 'SYSTEM' | 'LIGHT' | 'DARK';

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  showEmailPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  showPhonePublic?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}

