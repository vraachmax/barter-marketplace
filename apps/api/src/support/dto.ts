import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export type SupportTemplateCategoryDto =
  | 'QUICK_REPLY_BUYER'
  | 'QUICK_REPLY_SELLER'
  | 'FAQ'
  | 'SUPPORT_REPLY'
  | 'AUTO_REPLY_SELLER';

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  topic!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contact?: string;
}

export class AdviseDto {
  /// Роль запрашивающего
  @IsEnum(['buyer', 'seller', 'neutral'] as const)
  role!: 'buyer' | 'seller' | 'neutral';

  /// Опциональный listingId — тогда ассистент добавит контекст объявления
  @IsOptional()
  @IsString()
  listingId?: string;

  /// Чат, для которого даётся совет (ответ покупателю/продавцу на последнее сообщение)
  @IsOptional()
  @IsString()
  chatId?: string;

  /// Свободный контекст — что спрашивает/о чём пишет собеседник
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  prompt?: string;
}

export class UpdateSellerAutoReplyDto {
  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  text?: string;
}
