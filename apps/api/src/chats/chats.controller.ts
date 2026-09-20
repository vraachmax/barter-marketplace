import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Logger,
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
  private readonly logger = new Logger(ChatsController.name);
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
    const { message, created } = await this.chats.sendMessageOnce(
      chatId, req.user.id, dto.text, dto.clientMessageId,
    );
    if (!created) return message;
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
    if (!file?.buffer?.length) throw new BadRequestException('file_required');
    if (text !== undefined && (typeof text !== 'string' || text.length > 4000)) {
      throw new BadRequestException('invalid_media_text');
    }
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
      await this.mediaStorage.delete(stored.url).catch(() => {
        this.logger.warn('Failed to clean up chat media after message persistence failure');
      });
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
