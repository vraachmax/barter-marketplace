import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { SendMessageDto } from './dto';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';

@UseGuards(AuthGuard('jwt'))
@Controller('chats')
export class ChatsController {
  constructor(
    private chats: ChatsService,
    private gateway: ChatsGateway,
  ) {}

  @Get()
  list(@Req() req: any) {
    return this.chats.list(req.user.id);
  }

  @Post('by-listing/:listingId')
  getOrCreateByListing(@Req() req: any, @Param('listingId') listingId: string) {
    return this.chats.getOrCreateByListing(listingId, req.user.id);
  }

  @Get(':chatId/messages')
  getMessages(@Req() req: any, @Param('chatId') chatId: string) {
    return this.chats.getMessages(chatId, req.user.id);
  }

  @Post(':chatId/messages')
  async sendMessage(@Req() req: any, @Param('chatId') chatId: string, @Body() dto: SendMessageDto) {
    const message = await this.chats.sendMessage(chatId, req.user.id, dto.text);
    this.gateway.server.to(`chat:${chatId}`).emit('message-created', {
      chatId,
      ...message,
    });
    await this.gateway.broadcastDealAssistantMessages(chatId);
    return message;
  }

  @Post(':chatId/media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'apps/api/uploads/chat-media',
        filename: (_req, file, cb) => {
          const stamp = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${stamp}${extname(file.originalname || '')}`);
        },
      }),
      limits: { fileSize: 40 * 1024 * 1024 },
    }),
  )
  async sendMedia(
    @Req() req: any,
    @Param('chatId') chatId: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body('text') text?: string,
    @Headers('x-session-id') sessionId?: string,
    @Headers('x-anonymous-id') anonymousId?: string,
  ) {
    if (!file) throw new BadRequestException('file_required');
    const mime = String(file.mimetype || '').toLowerCase();
    let mediaType: 'IMAGE' | 'VIDEO';
    if (mime.startsWith('image/')) mediaType = 'IMAGE';
    else if (mime.startsWith('video/')) mediaType = 'VIDEO';
    else throw new BadRequestException('unsupported_media_type');

    const message = await this.chats.sendMediaMessage(
      chatId,
      req.user.id,
      `/uploads/chat-media/${file.filename}`,
      mediaType,
      text,
      { sessionId, anonymousId },
    );
    this.gateway.server.to(`chat:${chatId}`).emit('message-created', {
      chatId,
      ...message,
    });
    await this.gateway.broadcastDealAssistantMessages(chatId);
    return message;
  }
}

