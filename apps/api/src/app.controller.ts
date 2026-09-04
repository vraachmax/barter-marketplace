import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MediaStorageService } from './storage/media-storage.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly mediaStorage: MediaStorageService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { ok: true, mediaStorage: this.mediaStorage.status };
  }
}
