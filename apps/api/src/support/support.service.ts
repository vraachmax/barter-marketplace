import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdviseDto,
  CreateSupportTicketDto,
  SupportTemplateCategoryDto,
  UpdateSellerAutoReplyDto,
} from './dto';

const TEMPLATE_SEED: Array<{
  code: string;
  category: SupportTemplateCategoryDto;
  title: string;
  text: string;
  sortOrder?: number;
}> = [
  // ── Покупатель → продавцу ──
  {
    code: 'buyer_greeting',
    category: 'QUICK_REPLY_BUYER',
    title: 'Здравствуйте!',
    text: 'Здравствуйте! Подскажите, объявление ещё актуально?',
    sortOrder: 10,
  },
  {
    code: 'buyer_still_available',
    category: 'QUICK_REPLY_BUYER',
    title: 'Ещё актуально?',
    text: 'Добрый день! Объявление ещё актуально?',
    sortOrder: 20,
  },
  {
    code: 'buyer_when_can_pickup',
    category: 'QUICK_REPLY_BUYER',
    title: 'Когда можно посмотреть?',
    text: 'Когда можно подъехать посмотреть?',
    sortOrder: 30,
  },
  {
    code: 'buyer_negotiable',
    category: 'QUICK_REPLY_BUYER',
    title: 'Торг уместен?',
    text: 'Скажите, торг возможен?',
    sortOrder: 40,
  },
  {
    code: 'buyer_delivery',
    category: 'QUICK_REPLY_BUYER',
    title: 'Доставка возможна?',
    text: 'Подскажите, доставка возможна?',
    sortOrder: 50,
  },
  {
    code: 'buyer_more_photos',
    category: 'QUICK_REPLY_BUYER',
    title: 'Ещё фото?',
    text: 'Сможете прислать дополнительные фотографии?',
    sortOrder: 60,
  },

  // ── Продавец → покупателю ──
  {
    code: 'seller_greeting',
    category: 'QUICK_REPLY_SELLER',
    title: 'Здравствуйте!',
    text: 'Здравствуйте! Да, объявление актуально. Что вас интересует?',
    sortOrder: 10,
  },
  {
    code: 'seller_yes_actual',
    category: 'QUICK_REPLY_SELLER',
    title: 'Да, актуально',
    text: 'Да, всё в наличии и актуально.',
    sortOrder: 20,
  },
  {
    code: 'seller_when_pickup',
    category: 'QUICK_REPLY_SELLER',
    title: 'Когда удобно?',
    text: 'Когда вам удобно подъехать?',
    sortOrder: 30,
  },
  {
    code: 'seller_no_bargain',
    category: 'QUICK_REPLY_SELLER',
    title: 'Цена окончательная',
    text: 'Цена окончательная, торг не предусмотрен.',
    sortOrder: 40,
  },
  {
    code: 'seller_address_dm',
    category: 'QUICK_REPLY_SELLER',
    title: 'Адрес в личку',
    text: 'Скину адрес сразу после согласования времени.',
    sortOrder: 50,
  },
  {
    code: 'seller_keep_in_chat',
    category: 'QUICK_REPLY_SELLER',
    title: 'Только Бартер-чат',
    text: 'Для безопасности продолжим в чате площадки.',
    sortOrder: 60,
  },

  // ── FAQ для виджета поддержки ──
  {
    code: 'faq_free_listing',
    category: 'FAQ',
    title: 'Размещение объявлений — платное?',
    text: 'Нет. Размещение объявлений на Бартере полностью бесплатное. Платными являются только пакеты продвижения (TOP, VIP, поднятия) и подписка Бартер Pro для увеличения лимита активных объявлений.',
    sortOrder: 10,
  },
  {
    code: 'faq_promote',
    category: 'FAQ',
    title: 'Как работает продвижение?',
    text: 'Можно поднять объявление в выдаче на 1 или 7 дней пакетами «Поднятие x2/x5/x10», подсветить его как VIP, добавить XL-карточку или взять «Турбо» (всё сразу). Цены вдвое ниже Avito и оплачиваются с баланса кошелька.',
    sortOrder: 20,
  },
  {
    code: 'faq_pro_subscription',
    category: 'FAQ',
    title: 'Что даёт подписка Бартер Pro?',
    text: 'Бартер Pro повышает лимит активных объявлений (Старт — 50, Профи — 200, Бизнес — без ограничений), включает приоритет в поиске и отдельный бейдж «Pro-продавец».',
    sortOrder: 30,
  },
  {
    code: 'faq_topup',
    category: 'FAQ',
    title: 'Как пополнить кошелёк?',
    text: 'Перейдите в раздел «Кошелёк» в профиле, выберите сумму и подтвердите пополнение. В alpha-версии пополнение мгновенное (без интеграции с банком).',
    sortOrder: 40,
  },
  {
    code: 'faq_safety',
    category: 'FAQ',
    title: 'Как безопасно общаться?',
    text: 'Не переходите по ссылкам в сторонние мессенджеры (WhatsApp, Telegram и т.п.) по просьбе незнакомого собеседника. Все договорённости и переписку лучше вести в чате Бартера: так у поддержки остаётся вся история сделки.',
    sortOrder: 50,
  },
  {
    code: 'faq_report',
    category: 'FAQ',
    title: 'Как пожаловаться на объявление?',
    text: 'На карточке объявления есть кнопка «Пожаловаться». После 3 жалоб объявление автоматически уходит на повторную модерацию.',
    sortOrder: 60,
  },
  {
    code: 'faq_archive_listing',
    category: 'FAQ',
    title: 'Как снять объявление?',
    text: 'Откройте «Профиль → Мои объявления», у нужной карточки нажмите «В архив». Объявление можно вернуть в любой момент или удалить навсегда.',
    sortOrder: 70,
  },

  // ── Готовые ответы виджета поддержки ──
  {
    code: 'support_widget_hello',
    category: 'SUPPORT_REPLY',
    title: 'Приветствие виджета',
    text: 'Здравствуйте! Я бот поддержки Бартера. Опишите вопрос — постараюсь ответить сразу или передам команде.',
    sortOrder: 10,
  },
  {
    code: 'support_widget_received',
    category: 'SUPPORT_REPLY',
    title: 'Заявка принята',
    text: 'Спасибо! Мы получили обращение и ответим в течение рабочего дня. Ответ придёт на указанный контакт или появится в личном кабинете.',
    sortOrder: 20,
  },

  // ── Дефолтный автоответ продавца ──
  {
    code: 'seller_auto_reply_default',
    category: 'AUTO_REPLY_SELLER',
    title: 'Дефолтный автоответ продавца',
    text: 'Здравствуйте! Спасибо за сообщение, отвечу в течение часа. Сейчас, возможно, занят — пожалуйста, подождите.',
    sortOrder: 10,
  },
];

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  //  Seed
  // ─────────────────────────────────────────────
  async ensureSeed() {
    const count = await this.prisma.supportTemplate.count();
    if (count >= TEMPLATE_SEED.length) return;

    for (const t of TEMPLATE_SEED) {
      await this.prisma.supportTemplate.upsert({
        where: { code: t.code },
        update: {
          category: t.category,
          title: t.title,
          text: t.text,
          sortOrder: t.sortOrder ?? 0,
          isActive: true,
        },
        create: {
          code: t.code,
          category: t.category,
          title: t.title,
          text: t.text,
          sortOrder: t.sortOrder ?? 0,
        },
      });
    }
  }

  // ─────────────────────────────────────────────
  //  Templates / FAQ
  // ─────────────────────────────────────────────
  async listTemplates(category?: SupportTemplateCategoryDto) {
    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;

    return this.prisma.supportTemplate.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        code: true,
        category: true,
        title: true,
        text: true,
        sortOrder: true,
      },
    });
  }

  async listFaq() {
    return this.listTemplates('FAQ');
  }

  async getTemplateByCode(code: string) {
    const t = await this.prisma.supportTemplate.findUnique({ where: { code } });
    if (!t) throw new NotFoundException('template_not_found');
    return t;
  }

  // ─────────────────────────────────────────────
  //  AI-ассистент: подсказки/советы
  // ─────────────────────────────────────────────
  /**
   * Простой rule-based ассистент. На alpha без LLM:
   *  - подбирает несколько шаблонов под роль и ключевые слова в prompt;
   *  - формирует tip — короткий совет с учётом контекста объявления.
   */
  async advise(userId: string, dto: AdviseDto) {
    const { role, listingId, chatId, prompt } = dto;

    // 1) Контекст объявления
    let listingCtx: {
      id: string;
      title: string;
      priceRub: number | null;
      city: string;
      ownerId: string;
    } | null = null;

    if (listingId) {
      const l = await this.prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          title: true,
          priceRub: true,
          city: true,
          ownerId: true,
        },
      });
      if (l) listingCtx = l;
    }

    // 2) Контекст чата (последнее сообщение собеседника)
    let lastPeerText: string | null = null;
    if (chatId) {
      const last = await this.prisma.message.findFirst({
        where: { chatId, senderId: { not: userId } },
        orderBy: { createdAt: 'desc' },
        select: { text: true },
      });
      lastPeerText = last?.text ?? null;
    }

    const haystack = [prompt, lastPeerText].filter(Boolean).join(' ').toLowerCase();

    // 3) Подбор шаблонов
    const category: SupportTemplateCategoryDto =
      role === 'seller' ? 'QUICK_REPLY_SELLER' : 'QUICK_REPLY_BUYER';

    const allTemplates = await this.listTemplates(category);

    const KEYWORD_TO_CODES: Array<[RegExp, string[]]> = [
      [/торг|скидк|дешев/, role === 'seller' ? ['seller_no_bargain'] : ['buyer_negotiable']],
      [/доставк/, role === 'seller' ? ['seller_address_dm'] : ['buyer_delivery']],
      [/фото|снимок|показ/, role === 'seller' ? ['seller_yes_actual'] : ['buyer_more_photos']],
      [/когда|время|подъед|посмотр/, role === 'seller' ? ['seller_when_pickup'] : ['buyer_when_can_pickup']],
      [/актуал|есть ещё|ещё актуал/, role === 'seller' ? ['seller_yes_actual'] : ['buyer_still_available']],
      [/whatsapp|телегра|вотсап|телега|tg|wa\b/, role === 'seller' ? ['seller_keep_in_chat'] : []],
    ];

    const suggested = new Map<string, (typeof allTemplates)[number]>();
    if (haystack) {
      for (const [rx, codes] of KEYWORD_TO_CODES) {
        if (!rx.test(haystack)) continue;
        for (const code of codes) {
          const t = allTemplates.find((x) => x.code === code);
          if (t) suggested.set(t.code, t);
        }
      }
    }
    // если ничего не подошло — берём топ-3 шаблона по sortOrder
    if (suggested.size === 0) {
      for (const t of allTemplates.slice(0, 3)) suggested.set(t.code, t);
    }

    // 4) Совет
    const tip = this.buildTip({ role, listingCtx, haystack });

    return {
      role,
      listing: listingCtx,
      lastPeerText,
      tip,
      suggestions: Array.from(suggested.values()).slice(0, 6),
    };
  }

  private buildTip(args: {
    role: 'buyer' | 'seller' | 'neutral';
    listingCtx: { title: string; priceRub: number | null; city: string } | null;
    haystack: string;
  }) {
    const { role, listingCtx, haystack } = args;

    if (/whatsapp|телегра|вотсап|телега|tg|wa\b/.test(haystack)) {
      return 'Лучше остаться в чате Бартера: переход в сторонние мессенджеры — частый признак мошенничества.';
    }

    if (role === 'seller') {
      if (listingCtx?.priceRub) {
        return `Совет: уточните дату осмотра и предложите конкретный временной слот. Если просят торг — назовите минимум, ниже которого уйти готовы. Цена в карточке: ${listingCtx.priceRub.toLocaleString('ru-RU')} ₽.`;
      }
      return 'Совет: ответьте быстро (в первые 15 минут). Это сильно повышает шанс сделки и улучшает рейтинг ответов.';
    }

    if (role === 'buyer') {
      if (listingCtx) {
        return `Совет: спросите про состояние, причину продажи и удобное время осмотра. Если объявление в «${listingCtx.city}» — заранее уточните точный район.`;
      }
      return 'Совет: задавайте короткие конкретные вопросы — продавцы охотнее отвечают на 1–2 вопроса за сообщение.';
    }

    return 'Совет: пишите коротко и по делу — это ускоряет ответ.';
  }

  // ─────────────────────────────────────────────
  //  Виджет поддержки — обращения
  // ─────────────────────────────────────────────
  async createTicket(userId: string | null, dto: CreateSupportTicketDto) {
    if (!userId && !dto.contact?.trim()) {
      throw new BadRequestException('contact_required_for_guest');
    }
    return this.prisma.supportTicket.create({
      data: {
        userId,
        contact: dto.contact?.trim() || null,
        topic: dto.topic.trim(),
        message: dto.message.trim(),
      },
      select: {
        id: true,
        createdAt: true,
        topic: true,
        status: true,
      },
    });
  }

  async listMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        topic: true,
        message: true,
        status: true,
        adminReply: true,
      },
    });
  }

  // ─────────────────────────────────────────────
  //  Автоответы продавца (3.5)
  // ─────────────────────────────────────────────
  async getSellerAutoReply(userId: string) {
    const u = (await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        sellerAutoReplyEnabled: true,
        sellerAutoReplyText: true,
      } as any,
    })) as { sellerAutoReplyEnabled: boolean; sellerAutoReplyText: string | null } | null;
    if (!u) throw new NotFoundException('user_not_found');

    let defaultText: string | null = null;
    if (!u.sellerAutoReplyText) {
      const tpl = await this.prisma.supportTemplate.findUnique({
        where: { code: 'seller_auto_reply_default' },
        select: { text: true },
      });
      defaultText = tpl?.text ?? null;
    }

    return {
      enabled: !!u.sellerAutoReplyEnabled,
      text: u.sellerAutoReplyText ?? defaultText ?? '',
      isCustom: !!u.sellerAutoReplyText,
      defaultText,
    };
  }

  async updateSellerAutoReply(userId: string, dto: UpdateSellerAutoReplyDto) {
    const data: Record<string, unknown> = {};
    if (typeof dto.enabled === 'boolean') data.sellerAutoReplyEnabled = dto.enabled;
    if (dto.text !== undefined) {
      const trimmed = dto.text.trim();
      data.sellerAutoReplyText = trimmed.length === 0 ? null : trimmed;
    }
    if (Object.keys(data).length === 0) return this.getSellerAutoReply(userId);

    await this.prisma.user.update({ where: { id: userId }, data: data as any });
    return this.getSellerAutoReply(userId);
  }

  /**
   * Резолвит текст автоответа продавца — для использования в чате.
   * Возвращает null, если автоответ выключен.
   */
  async resolveSellerAutoReplyText(userId: string): Promise<string | null> {
    const settings = await this.getSellerAutoReply(userId);
    if (!settings.enabled) return null;
    return settings.text || null;
  }
}
