import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateMeDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private sign(userId: string) {
    return this.jwt.sign({ sub: userId });
  }

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('email_or_phone_required');
    }
    if (dto.email && dto.phone) {
      throw new BadRequestException('choose_email_or_phone');
    }

    const existing = dto.email
      ? await this.prisma.user.findUnique({ where: { email: dto.email } })
      : await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new BadRequestException('already_registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        passwordHash,
      },
      select: { id: true },
    });
    return { token: this.sign(user.id) };
  }

  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('email_or_phone_required');
    }
    if (dto.email && dto.phone) {
      throw new BadRequestException('choose_email_or_phone');
    }

    const identifiers: Prisma.UserWhereInput[] = [];
    if (dto.email) identifiers.push({ email: dto.email });
    if (dto.phone) identifiers.push({ phone: dto.phone });
    const user = await this.prisma.user.findFirst({
      where: { OR: identifiers },
    });
    if (!user?.passwordHash) throw new UnauthorizedException();

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException();
    return { token: this.sign(user.id) };
  }

  async loginWithYandex(profile: {
    id: string;
    default_email?: string;
    display_name?: string;
    real_name?: string;
    first_name?: string;
    last_name?: string;
  }) {
    const email = profile.default_email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('yandex_email_required');

    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'yandex',
          providerAccountId: profile.id,
        },
      },
      select: { userId: true },
    });
    if (existingAccount) return { token: this.sign(existingAccount.userId) };

    const name =
      profile.real_name?.trim() ||
      profile.display_name?.trim() ||
      [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      null;

    const userId = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email },
        select: { id: true, name: true },
      });
      const user = existingUser
        ? existingUser.name || !name
          ? existingUser
          : await tx.user.update({
              where: { id: existingUser.id },
              data: { name },
              select: { id: true, name: true },
            })
        : await tx.user.create({
            data: { email, passwordHash: null, name },
            select: { id: true, name: true },
          });

      await tx.oAuthAccount.create({
        data: {
          provider: 'yandex',
          providerAccountId: profile.id,
          userId: user.id,
        },
      });
      return user.id;
    });

    return { token: this.sign(userId) };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatarUrl: true,
        about: true,
        companyName: true,
        companyInfo: true,
        showEmailPublic: true,
        showPhonePublic: true,
        appTheme: true,
        notificationsEnabled: true,
        marketingEnabled: true,
        oauthAccounts: { select: { provider: true } },
        createdAt: true,
      },
    });
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });
    if (!current) throw new UnauthorizedException();

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim() || null;
    if (dto.avatarUrl !== undefined)
      data.avatarUrl = dto.avatarUrl.trim() || null;
    if (dto.about !== undefined) data.about = dto.about.trim() || null;
    if (dto.companyName !== undefined)
      data.companyName = dto.companyName.trim() || null;
    if (dto.companyInfo !== undefined)
      data.companyInfo = dto.companyInfo.trim() || null;
    if (dto.appTheme !== undefined) data.appTheme = dto.appTheme;
    if (dto.notificationsEnabled !== undefined)
      data.notificationsEnabled = dto.notificationsEnabled;
    if (dto.marketingEnabled !== undefined)
      data.marketingEnabled = dto.marketingEnabled;
    if (dto.showEmailPublic !== undefined)
      data.showEmailPublic = dto.showEmailPublic;
    if (dto.showPhonePublic !== undefined)
      data.showPhonePublic = dto.showPhonePublic;

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase() || null;
      if (email) {
        const exists = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        if (exists && exists.id !== userId)
          throw new BadRequestException('email_already_used');
      }
      data.email = email;
    }

    if (dto.phone !== undefined) {
      const phone = dto.phone.trim() || null;
      if (phone) {
        const exists = await this.prisma.user.findUnique({
          where: { phone },
          select: { id: true },
        });
        if (exists && exists.id !== userId)
          throw new BadRequestException('phone_already_used');
      }
      data.phone = phone;
    }

    const nextEmail = dto.email !== undefined ? data.email : current.email;
    const nextPhone = dto.phone !== undefined ? data.phone : current.phone;
    if (!nextEmail && !nextPhone) {
      throw new BadRequestException('email_or_phone_required');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
    return this.me(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new UnauthorizedException();

    if (!user.passwordHash) {
      throw new BadRequestException('password_login_unavailable');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('wrong_current_password');

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
    return { ok: true, token: this.sign(userId) };
  }
}
