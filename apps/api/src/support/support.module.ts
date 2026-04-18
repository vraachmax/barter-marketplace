import { Module, OnModuleInit } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule implements OnModuleInit {
  constructor(private support: SupportService) {}

  async onModuleInit() {
    try {
      await this.support.ensureSeed();
    } catch (err) {
      // Не валим API на пустой/незамигрированной БД
      // eslint-disable-next-line no-console
      console.warn('[support] ensureSeed skipped:', (err as Error).message);
    }
  }
}
