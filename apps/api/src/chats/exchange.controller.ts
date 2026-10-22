import { Body, Controller, Get, Header, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExchangeService } from './exchange.service';
import { CreateExchangeDto, ExchangeActionDto, ChatSettingDto } from './exchange.dto';
import { ChatsService } from './chats.service';
import { ChatsGateway } from './chats.gateway';
@UseGuards(AuthGuard('jwt'))
@Controller('chats/:chatId')
export class ExchangeController {
  constructor(private exchanges: ExchangeService, private chats: ChatsService, private gateway: ChatsGateway) {}
  @Get('offers') list(@Req() req: any, @Param('chatId') id: string) { return this.exchanges.list(id, req.user.id); }
  @Get('exchange-choices') choices(@Req() req: any, @Param('chatId') id: string) { return this.exchanges.choices(id, req.user.id); }
  @Post('offers') async create(@Req() req: any, @Param('chatId') id: string, @Body() dto: CreateExchangeDto) {
    const offer = await this.exchanges.create(id, req.user.id, dto);
    this.gateway.server.to(`chat:${id}`).emit('exchange-updated', { chatId: id });
    return offer;
  }
  @Post('offers/:offerId') async act(@Req() req: any, @Param('chatId') id: string, @Param('offerId') offerId: string, @Body() dto: ExchangeActionDto) {
    const offer = await this.exchanges.act(id, offerId, req.user.id, dto);
    this.gateway.server.to(`chat:${id}`).emit('exchange-updated', { chatId: id });
    return offer;
  }
  @Get('offers/:offerId/confirmation-qr') @Header('Cache-Control', 'no-store') qr(@Req() req: any, @Param('chatId') id: string, @Param('offerId') offerId: string) {
    return this.exchanges.handoffQr(id, offerId, req.user.id);
  }
  @Get('details') details(@Req() req: any, @Param('chatId') id: string) { return this.chats.details(id, req.user.id); }
  @Post('settings') setting(@Req() req: any, @Param('chatId') id: string, @Body() dto: ChatSettingDto) { return this.chats.setting(id, req.user.id, dto); }
}
