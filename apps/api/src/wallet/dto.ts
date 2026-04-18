import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TopupDto {
  /// Сумма пополнения в рублях (для UI удобнее целые), 1 ≤ amountRub ≤ 1_000_000
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  amountRub!: number;

  /// Произвольная метка платёжного провайдера (мок в alpha)
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class PromoteFromWalletDto {
  /// Код пакета промо из каталога PromotionPackage.code
  @IsString()
  packageCode!: string;

  /// Объявление, на которое оформляется промо
  @IsString()
  listingId!: string;
}

export class SubscribeProDto {
  @IsString()
  planCode!: string;
}
