import { Controller, Delete, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FavoritesService } from './favorites.service';

@UseGuards(AuthGuard('jwt'))
@Controller('favorites')
export class FavoritesController {
  constructor(private favorites: FavoritesService) {}

  @Get()
  list(@Req() req: any) {
    return this.favorites.list(req.user.id);
  }

  @Post(':listingId')
  add(
    @Req() req: any,
    @Param('listingId') listingId: string,
    @Headers('x-session-id') sessionId?: string,
    @Headers('x-anonymous-id') anonymousId?: string,
  ) {
    return this.favorites.add(req.user.id, listingId, { sessionId, anonymousId });
  }

  @Delete(':listingId')
  remove(@Req() req: any, @Param('listingId') listingId: string) {
    return this.favorites.remove(req.user.id, listingId);
  }
}

