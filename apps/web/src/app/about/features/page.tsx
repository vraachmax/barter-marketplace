import Link from 'next/link';
import { ArrowLeft, ArrowRight, HeartHandshake, Layers3, MessagesSquare, SearchCheck, ShieldCheck, Sparkles } from 'lucide-react';

const items = [
  { id: 'exchange', eyebrow: '01 · ОБМЕН', title: 'Обменивайтесь без ограничений по категории',
    description: 'Нашли интересную вещь? Предложите владельцу своё объявление взамен и обсудите условия обмена.',
    icon: HeartHandshake, href: '/?mode=barter', action: 'Найти обмен' },
  { id: 'one-listing', eyebrow: '02 · ОБЪЯВЛЕНИЯ', title: 'Продажа и обмен в одном объявлении',
    description: 'При публикации можно выбрать покупку, обмен или оба варианта. Не нужно создавать две копии одного товара.',
    icon: Layers3, href: '/new?tradeMode=both', action: 'Разместить объявление' },
  { id: 'messages', eyebrow: '03 · ОБЩЕНИЕ', title: 'Договаривайтесь в сообщениях',
    description: 'Переписка, фотографии товара и обсуждение условий остаются в Barter. Не требуется переходить в чужие мессенджеры.',
    icon: MessagesSquare, href: '/messages', action: 'Перейти в сообщения' },
  { id: 'search', eyebrow: '04 · ПОИСК', title: 'Ищите то, что вам подходит',
    description: 'Категории, поиск и фильтры помогают находить вещи для покупки или обмена.',
    icon: SearchCheck, href: '/search', action: 'Открыть поиск' },
  { id: 'privacy', eyebrow: '05 · БЕЗОПАСНОСТЬ', title: 'Проверяйте условия сделки',
    description: 'Перед обменом уточните состояние товара, попросите дополнительные фотографии и договоритесь о безопасном месте встречи.',
    icon: ShieldCheck, href: '/messages', action: 'Обсудить условия' },
  { id: 'growth', eyebrow: '06 · ПРОДВИЖЕНИЕ', title: 'Помогите объявлению найти аудиторию',
    description: 'Выбирайте доступные варианты продвижения, когда хотите сделать объявление заметнее.',
    icon: Sparkles, href: '/profile', action: 'Мой профиль' },
] as const;

export const metadata = {
  title: 'Возможности БАРТЕРА',
  description: 'Покупка и обмен вещей, объявления, поиск и общение на БАРТЕРЕ.',
};

export default function BarterFeaturesPage() {
  return (
    <main className="min-h-dvh bg-background pb-28 text-foreground">
      <div className="mx-auto max-w-5xl px-4 pt-5 md:px-8 md:pt-12">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft size={17} aria-hidden /> На главную
        </Link>
        <header className="relative mt-4 overflow-hidden rounded-[26px] bg-[#111113] px-6 py-9 text-white md:px-12 md:py-16">
          <span className="relative z-10 text-xs font-semibold tracking-[.13em] text-[#ff9661]">ВОЗМОЖНОСТИ БАРТЕРА</span>
          <h1 className="relative z-10 mt-3 max-w-[580px] text-[31px] font-extrabold leading-[1.1] tracking-[-.7px] md:text-[55px]">Меняй. Покупай.<br />Открывай новое.</h1>
          <p className="relative z-10 mt-4 max-w-[400px] text-sm leading-6 text-[#cbcad0] md:text-base">
            Один сервис для вещей, которые нужны, и вещей, которыми готовы поделиться.
          </p>
          <div className="pointer-events-none absolute -right-28 -top-24 h-[320px] w-[320px] rounded-full border-[42px] border-[#ff5a0a]/70 blur-[2px] md:right-2" aria-hidden />
          <div className="pointer-events-none absolute -bottom-40 right-12 h-[250px] w-[250px] rounded-full bg-[#ff5a0a]/30 blur-[70px]" aria-hidden />
        </header>
        <div className="mt-7 grid gap-4 md:mt-10 md:grid-cols-2">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <section key={item.id} id={item.id} className="scroll-mt-6 flex flex-col rounded-[23px] border border-border bg-card p-5 shadow-[0_4px_16px_rgba(20,20,40,.03)] md:min-h-[265px] md:p-7">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[.12em] text-[#ff5a0a]">{item.eyebrow}</span>
                  <span className="grid size-12 place-items-center rounded-[14px] bg-[#ff5a0a]/10 text-[#ff5a0a]"><Icon size={25} strokeWidth={1.7} aria-hidden /></span>
                </div>
                <h2 className="mt-4 max-w-[350px] text-[21px] font-bold leading-[1.2] tracking-[-.25px]">{item.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-[1.65] text-muted-foreground">{item.description}</p>
                <Link href={item.href} className="mt-5 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-[#ff5a0a]">
                  {item.action} <ArrowRight size={17} aria-hidden />
                </Link>
              </section>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-[600px] text-center text-xs leading-5 text-muted-foreground">
          БАРТЕР помогает найти друг друга и договориться. Передавайте товары и деньги только после проверки условий и состояния вещи.
        </p>
      </div>
    </main>
  );
}
