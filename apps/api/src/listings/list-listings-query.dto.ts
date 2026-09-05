import { BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const LISTING_SORTS = [
  'relevant',
  'new',
  'cheap',
  'expensive',
  'nearby',
] as const;
export type ListingSort = (typeof LISTING_SORTS)[number];

function optionalText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ') || undefined;
}

// Do not coerce arrays/objects/booleans, hexadecimal or exponent notation.
// Invalid inputs stay invalid instead of silently removing the user's filter.
function optionalDecimal(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^-?\d+(?:\.\d+)?$/.test(trimmed) ? Number(trimmed) : value;
}

export class ListListingsQueryDto {
  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(128)
  categoryId?: string;

  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @Transform(({ value }: { value: unknown }) => optionalText(value))
  @IsOptional()
  @IsIn(LISTING_SORTS)
  sort?: ListingSort;

  @Transform(({ value }: { value: unknown }) => optionalDecimal(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  priceMin?: number;

  @Transform(({ value }: { value: unknown }) => optionalDecimal(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  priceMax?: number;

  @Transform(({ value }: { value: unknown }) => optionalDecimal(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  lat?: number;

  @Transform(({ value }: { value: unknown }) => optionalDecimal(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lon?: number;

  @Transform(({ value }: { value: unknown }) => optionalDecimal(value))
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(500)
  radiusKm?: number;

  @Transform(({ value }: { value: unknown }) => optionalDecimal(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  page?: number;

  @Transform(({ value }: { value: unknown }) => optionalDecimal(value))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/** Cross-field validation runs after Nest's global ValidationPipe. */
export function normalizeListingsQuery(query: ListListingsQueryDto) {
  if (
    query.priceMin != null &&
    query.priceMax != null &&
    query.priceMin > query.priceMax
  ) {
    throw new BadRequestException({
      code: 'invalid_price_range',
      field: 'priceMax',
      message: 'Цена «до» должна быть не меньше цены «от».',
    });
  }
  const hasLat = query.lat != null;
  const hasLon = query.lon != null;
  if (
    hasLat !== hasLon ||
    (query.sort === 'nearby' && !hasLat) ||
    (query.radiusKm != null && !hasLat)
  ) {
    throw new BadRequestException({
      code: 'coordinates_required',
      field: 'lat,lon',
      message: 'Для поиска по расстоянию укажите широту и долготу вместе.',
    });
  }
  return {
    ...query,
    page: query.page ?? 1,
    limit: query.limit ?? 20,
    sort: query.sort ?? 'relevant',
  };
}
