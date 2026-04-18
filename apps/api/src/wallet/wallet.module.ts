import { Module, OnModuleInit } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule implements OnModuleInit {
  constructor(private wallet: WalletService) {}

  async onModuleInit() {
    try {
      await this.wallet.ensureSeed();
    } catch (err) {
      // Не валим старт API, если БД не готова (миграции, отсутствие таблицы в dev)
      // eslint-disable-next-line no-console
      console.warn('[wallet] ensureSeed skipped:', (err as Error).message);
    }
  }
}
