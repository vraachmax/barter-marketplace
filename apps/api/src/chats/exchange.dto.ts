import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
export class CreateExchangeDto {
  @IsUUID('4') clientKey!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsString({ each: true }) giveIds!: string[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ArrayUnique() @IsString({ each: true }) receiveIds!: string[];
  // Positive: proposer pays. Negative: proposer receives. Stored in kopecks.
  @IsInt() @Min(-2000000000) @Max(2000000000) cashKopecks!: number;
  @IsString() @MaxLength(2000) terms!: string;
  @IsInt() @Min(1) @Max(30) validDays!: number;
  @IsOptional() @IsString() previousId?: string;
}
export class ExchangeActionDto {
  @IsInt() @Min(1) version!: number;
  @IsIn(['accept', 'decline', 'cancel', 'confirm']) action!: 'accept' | 'decline' | 'cancel' | 'confirm';
}
export class ChatSettingDto {
  @IsIn(['mute', 'unmute', 'block', 'unblock', 'report']) action!: string;
  @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}
