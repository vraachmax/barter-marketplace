import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PromoteFromWalletDto, SubscribeProDto, TopupDto } from './dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private wallet: WalletService) {}

  // Публичные справочники каталога тарифов (без авторизации, для /pricing)
  @Get('packages')
  listPackages(@Query('audience') audience?: 'PERSONAL' | 'BUSINESS') {
    return this.wallet.listPackages(audience);
  }

  @Get('pro-plans')
  listProPlans() {
    return this.wallet.listProPlans();
  }

  // Приватные эндпоинты
  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  balance(@Req() req: any) {
    return this.wallet.getBalance(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('transactions')
  transactions(@Req() req: any, @Query('limit') limit?: string) {
    return this.wallet.listTransactions(req.user.id, limit ? Number(limit) : 50);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('topup')
  topup(@Req() req: any, @Body() dto: TopupDto) {
    return this.wallet.topup(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('promote')
  promote(@Req() req: any, @Body() dto: PromoteFromWalletDto) {
    return this.wallet.promoteFromWallet(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('pro/subscribe')
  subscribePro(@Req() req: any, @Body() dto: SubscribeProDto) {
    return this.wallet.subscribePro(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('pro/subscription')
  mySubscription(@Req() req: any) {
    return this.wallet.getProSubscription(req.user.id);
  }
}
