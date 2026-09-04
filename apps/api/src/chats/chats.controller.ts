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
import { SendMessageDto } from './dto';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';
import { getMediaType, MediaStorageService } from '../storage/media-storage.service';

@UseGuards(AuthGuard('jwt'))
@Controller('chats')
export class ChatsController {
  constructor(
    private chats: ChatsService,
    private gateway: ChatsGateway,
    private mediaStorage: MediaStorageService,
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
  async sendMessage(
    @Req() req: any,
    @Param('chatId') chatId: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.chats.sendMessage(chatId, req.user.id, dto.text);
    this.gateway.server.to(`chat:${chatId}`).emit('message-created', {
      chatId,
      ...message,
    });
    await this.gateway.broadcastSellerAutoReply(chatId, req.user.id);
    await this.gateway.broadcastDealAssistantMessages(chatId);
    return message;
  }

  @Post(':chatId/media')
  @UseInterceptors(
    FileInterceptor('file', {
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
    const mediaType = getMediaType(file);
    await this.chats.assertParticipant(chatId, req.user.id);
    const stored = await this.mediaStorage.upload('chat-media', chatId, file);
    let message;
    try {
      message = await this.chats.sendMediaMessage(
        chatId,
        req.user.id,
        stored.url,
        mediaType,
        text,
        { sessionId, anonymousId },
      );
    } catch (error) {
      await this.mediaStorage.delete(stored.url).catch(() => undefined);
      throw error;
    }
    this.gateway.server.to(`chat:${chatId}`).emit('message-created', {
      chatId,
      ...message,
    });
    await this.gateway.broadcastSellerAutoReply(chatId, req.user.id);
    await this.gateway.broadcastDealAssistantMessages(chatId);
    return message;
  }
}
