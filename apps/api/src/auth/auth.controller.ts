import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateMeDto } from './dto';

function cookieOpts(req: Request) {
  const proto = req.headers['x-forwarded-proto'] ?? req.protocol;
  const isSecure = proto === 'https';
  return {
    httpOnly: false,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    secure: isSecure,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token } = await this.auth.register(dto);
    res.cookie('token', token, cookieOpts(req));
    return { ok: true, token };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { token } = await this.auth.login(dto);
    res.cookie('token', token, cookieOpts(req));
    return { ok: true, token };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', { path: '/' });
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user?.id as string;
    return this.auth.me(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(@Req() req: any, @Body() dto: UpdateMeDto) {
    const userId = req.user?.id as string;
    return this.auth.updateMe(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ChangePasswordDto,
  ) {
    const userId = req.user?.id as string;
    const result = await this.auth.changePassword(userId, dto);
    res.cookie('token', result.token, cookieOpts(req as Request));
    return result;
  }
}

