import { ListingStatus, PromotionType } from '@prisma/client';
import {
  Allow,
  ArrayNotEmpty,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsArray,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsListingAttributes } from './is-listing-attributes.decorator';

export class CreateListingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceRub?: number;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @ValidateIf((o: CreateListingDto) => o.latitude != null || o.longitude != null)
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ValidateIf((o: CreateListingDto) => o.latitude != null || o.longitude != null)
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsListingAttributes()
  attributes?: Record<string, string | number | boolean | null>;
}

export class PromoteListingDto {
  @IsEnum(PromotionType)
  type!: PromotionType;

  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;
}

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceRub?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @ValidateIf((_o, v) => typeof v === 'number')
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @ValidateIf((_o, v) => typeof v === 'number')
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Allow()
  @IsListingAttributes()
  attributes?: Record<string, string | number | boolean | null>;

  /** Владелец: вывести из PENDING в ACTIVE после проверки повторов фото. */
  @IsOptional()
  @IsBoolean()
  publishFromModeration?: boolean;
}

export class ReportListingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateListingStatusDto {
  @IsEnum(ListingStatus)
  status!: ListingStatus;
}

export class ReorderListingImagesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  imageIds!: string[];
}

