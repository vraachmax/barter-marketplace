import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { MediaStorageService } from '../storage/media-storage.service';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

describe('GET /listings query validation', () => {
  let app: INestApplication<Server>;
  const list = jest.fn().mockResolvedValue({ items: [] });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ListingsController],
      providers: [
        { provide: ListingsService, useValue: { list } },
        { provide: MediaStorageService, useValue: {} },
      ],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<Server>>();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => list.mockClear());
  afterAll(async () => {
    await app?.close();
  });

  it('forwards normalized filters and pagination to the real controller', async () => {
    await request(app.getHttpServer())
      .get('/listings')
      .query({
        q: '  iPhone  14 ',
        city: ' Краснодар ',
        categoryId: 'electronics',
        priceMin: '0',
        priceMax: '50000',
        sort: 'cheap',
        page: '2',
        limit: '20',
      })
      .expect(200, { items: [] });

    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith({
      q: 'iPhone 14',
      city: 'Краснодар',
      categoryId: 'electronics',
      priceMin: 0,
      priceMax: 50000,
      sort: 'cheap',
      page: 2,
      limit: 20,
    });
  });

  it('uses defaults for a query-free request', async () => {
    await request(app.getHttpServer()).get('/listings').expect(200);
    expect(list).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      sort: 'relevant',
    });
  });

  it.each([
    'priceMin=oops',
    'priceMin=5000&priceMax=1000',
    'page=0',
    'sort=nearby',
    'q=iphone&q=samsung',
    'unrecognizedFilter=value',
  ])('rejects %s before calling the listings service', async (query) => {
    await request(app.getHttpServer()).get(`/listings?${query}`).expect(400);
    expect(list).not.toHaveBeenCalled();
  });
});
