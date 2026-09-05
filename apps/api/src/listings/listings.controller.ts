import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CreateListingDto,
  PromoteListingDto,
  ReorderListingImagesDto,
  ReportListingDto,
  UpdateListingDto,
  UpdateListingStatusDto,
} from './dto';
import {
  ListListingsQueryDto,
  normalizeListingsQuery,
} from './list-listings-query.dto';
import { ListingsService } from './listings.service';
import { assertListingImage, MediaStorageService } from '../storage/media-storage.service';

@Controller('listings')
export class ListingsController {
  constructor(
    private listings: ListingsService,
    private mediaStorage: MediaStorageService,
  ) {}

  @Get('map')
  async mapPins(
    @Query('swLat') swLat?: string,
    @Query('swLon') swLon?: string,
    @Query('neLat') neLat?: string,
    @Query('neLon') neLon?: string,
    @Query('categoryId') categoryId?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = Math.min(500, Math.max(1, Number(limitRaw) || 200));
    const bounds = {
      swLat: Number(swLat),
      swLon: Number(swLon),
      neLat: Number(neLat),
      neLon: Number(neLon),
    };
    if (
      [bounds.swLat, bounds.swLon, bounds.neLat, bounds.neLon].some(
        (v) => !Number.isFinite(v),
      )
    ) {
      return { pins: [] };
    }
    return this.listings.mapPins(bounds, categoryId, limit);
  }

  @Get()
  list(@Query() query: ListListingsQueryDto) {
    return this.listings.list(normalizeListingsQuery(query));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  my(@Req() req: any) {
    return this.listings.myListings(req.user.id);
  }

  @Get(':id/similar')
  similar(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('excludeIds') excludeIds?: string,
  ) {
    const excluded = (excludeIds ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    return this.listings.similar(id, limit ? Number(limit) : 10, excluded);
  }

  /** Публичный учёт клика по карточке (вовлечённость в ранжировании). */
  @Post(':id/click')
  recordClick(@Param('id') id: string) {
    return this.listings.recordClick(id);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.listings.get(id, req);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() dto: CreateListingDto, @Req() req: any) {
    return this.listings.create(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/promote')
  promote(
    @Param('id') id: string,
    @Body() dto: PromoteListingDto,
    @Req() req: any,
  ) {
    return this.listings.promote(req.user.id, id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @Req() req: any,
  ) {
    return this.listings.update(req.user.id, id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateListingStatusDto,
    @Req() req: any,
  ) {
    return this.listings.updateStatus(req.user.id, id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.listings.remove(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async uploadImage(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) return { ok: false, message: 'file_required' };
    assertListingImage(file);
    await this.listings.assertCanManage(req.user.id, id);
    const stored = await this.mediaStorage.upload('listings', id, file);
    try {
      return await this.listings.addImage(req.user.id, id, stored.url, stored.sha256);
    } catch (error) {
      await this.mediaStorage.delete(stored.url).catch(() => undefined);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/images/:imageId')
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Req() req: any,
  ) {
    return this.listings.deleteImage(req.user.id, id, imageId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/images/reorder')
  reorderImages(
    @Param('id') id: string,
    @Body() dto: ReorderListingImagesDto,
    @Req() req: any,
  ) {
    return this.listings.reorderImages(req.user.id, id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/report')
  report(
    @Param('id') id: string,
    @Body() dto: ReportListingDto,
    @Req() req: any,
  ) {
    return this.listings.reportListing(id, req.user.id, dto.reason);
  }
}
