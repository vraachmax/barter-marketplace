import { IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;

  // Optional for legacy clients; null/empty/malformed keys must not disable deduplication.
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID('4')
  clientMessageId?: string;
}
