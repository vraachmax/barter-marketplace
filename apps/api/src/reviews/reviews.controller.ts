import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateSellerReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@UseGuards(AuthGuard('jwt'))
@Controller('reviews')
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Get('my')
  my(@Req() req: any) {
    return this.reviews.my(req.user.id);
  }

  /** Можно ли оставить отзыв по объявлению (после взаимной переписки в чате). */
  @Get('listing/:listingId/eligibility')
  eligibility(@Req() req: any, @Param('listingId') listingId: string) {
    return this.reviews.eligibility(req.user.id, listingId);
  }

  @Post('admin/boost-me')
  boostMe(@Req() req: any) {
    return this.reviews.boostMe(req.user.id);
  }

  @Post('seller/:sellerId')
  create(
    @Req() req: any,
    @Param('sellerId') sellerId: string,
    @Body() dto: CreateSellerReviewDto,
  ) {
    return this.reviews.create(req.user.id, sellerId, dto);
  }
}

