import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateMeDto } from './dto';
import { YandexOAuthService } from './yandex-oauth.service';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

function cookieOpts(req: Request) {
  const proto = req.headers['x-forwarded-proto'] ?? req.protocol;
  const isSecure = proto === 'https';
  return {
    httpOnly: true,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    secure: isSecure,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}

type AuthenticatedRequest = Request & { user?: { id?: string } };

function authenticatedUserId(req: AuthenticatedRequest): string {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedException();
  return userId;
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private yandex: YandexOAuthService,
  ) {}

  @Get('providers')
  providers() {
    return { yandex: { enabled: this.yandex.isConfigured() } };
  }

  @Get('yandex')
  startYandex(@Req() req: Request, @Res() res: Response) {
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(48).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const secure =
      (req.headers['x-forwarded-proto'] ?? req.protocol) === 'https';
    const options = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure,
      path: '/auth/yandex',
      maxAge: 10 * 60 * 1000,
    };
    res.cookie('yandex_oauth_state', state, options);
    res.cookie('yandex_oauth_verifier', verifier, options);
    return res.redirect(this.yandex.buildAuthorizationUrl(state, challenge));
  }

  @Get('yandex/callback')
  async yandexCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') providerError: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webUrl = this.yandex.getWebAppUrl();
    const cookieState = req.cookies?.yandex_oauth_state as string | undefined;
    const verifier = req.cookies?.yandex_oauth_verifier as string | undefined;
    res.clearCookie('yandex_oauth_state', { path: '/auth/yandex' });
    res.clearCookie('yandex_oauth_verifier', { path: '/auth/yandex' });

    if (providerError) {
      return res.redirect(`${webUrl}/auth/yandex/callback?error=access_denied`);
    }
    if (
      !code ||
      !state ||
      !cookieState ||
      !verifier ||
      !safeEqual(state, cookieState)
    ) {
      return res.redirect(`${webUrl}/auth/yandex/callback?error=invalid_state`);
    }

    try {
      const profile = await this.yandex.exchangeCodeForProfile(code, verifier);
      const { token } = await this.auth.loginWithYandex(profile);
      res.cookie('token', token, cookieOpts(req));
      return res.redirect(
        `${webUrl}/auth/yandex/callback#token=${encodeURIComponent(token)}`,
      );
    } catch {
      return res.redirect(
        `${webUrl}/auth/yandex/callback?error=exchange_failed`,
      );
    }
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token } = await this.auth.register(dto);
    res.cookie('token', token, cookieOpts(req));
    return { ok: true, token };
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token } = await this.auth.login(dto);
    res.cookie('token', token, cookieOpts(req));
    return { ok: true, token };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const options = cookieOpts(req);
    res.clearCookie('token', {
      httpOnly: options.httpOnly,
      sameSite: options.sameSite,
      secure: options.secure,
      path: options.path,
    });
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    return this.auth.me(authenticatedUserId(req));
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateMeDto) {
    return this.auth.updateMe(authenticatedUserId(req), dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ChangePasswordDto,
  ) {
    const userId = authenticatedUserId(req);
    const result = await this.auth.changePassword(userId, dto);
    res.cookie('token', result.token, cookieOpts(req as Request));
    return result;
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
