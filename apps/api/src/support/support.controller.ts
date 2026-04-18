import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  AdviseDto,
  CreateSupportTicketDto,
  UpdateSellerAutoReplyDto,
} from './dto';
import type { SupportTemplateCategoryDto } from './dto';
import { SupportService } from './support.service';

@Controller('support')
export class SupportController {
  constructor(private support: SupportService) {}

  // ── Публичные ──
  @Get('templates')
  templates(@Query('category') category?: SupportTemplateCategoryDto) {
    return this.support.listTemplates(category);
  }

  @Get('faq')
  faq() {
    return this.support.listFaq();
  }

  @Get('templates/:code')
  template(@Param('code') code: string) {
    return this.support.getTemplateByCode(code);
  }

  // ── Виджет поддержки: создание тикета (можно гостем — userId=null) ──
  @Post('tickets')
  createTicket(@Req() req: any, @Body() dto: CreateSupportTicketDto) {
    const userId: string | null = req.user?.id ?? null;
    return this.support.createTicket(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('tickets/mine')
  myTickets(@Req() req: any) {
    return this.support.listMyTickets(req.user.id);
  }

  // ── AI-подсказки в чате ──
  @UseGuards(AuthGuard('jwt'))
  @Post('advise')
  advise(@Req() req: any, @Body() dto: AdviseDto) {
    return this.support.advise(req.user.id, dto);
  }

  // ── Автоответы продавца ──
  @UseGuards(AuthGuard('jwt'))
  @Get('seller/auto-reply')
  getAutoReply(@Req() req: any) {
    return this.support.getSellerAutoReply(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('seller/auto-reply')
  updateAutoReply(@Req() req: any, @Body() dto: UpdateSellerAutoReplyDto) {
    return this.support.updateSellerAutoReply(req.user.id, dto);
  }
}
