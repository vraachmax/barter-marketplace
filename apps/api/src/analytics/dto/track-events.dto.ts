import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
/** Имена событий в API (snake_case) */
export enum BehaviorEventTypeInput {
  view_item = 'view_item',
  click_item = 'click_item',
  add_to_favorites = 'add_to_favorites',
  send_message = 'send_message',
}

export class SingleBehaviorEventDto {
  @IsEnum(BehaviorEventTypeInput)
  type!: BehaviorEventTypeInput;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  listingId!: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

export class TrackEventsDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  anonymousId?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SingleBehaviorEventDto)
  events!: SingleBehaviorEventDto[];
}
