import Link from 'next/link';
import { Building2, CheckCircle, FileText, HelpCircle } from 'lucide-react';

const s = 1.8;

export function SiteFooter() {
  return (
    <footer className="bg-white py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-bold text-[#1a1a1a] dark:text-zinc-50">Barter</p>
            <p className="mt-2 text-xs leading-relaxed text-[#6b7280] dark:text-zinc-400">
              Маркетплейс объявлений по всей России. Покупайте и продавайте легко.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280] dark:text-zinc-400">
              Покупателям
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/" className="text-[#6b7280] hover:text-[#00B4D8] dark:text-zinc-400 dark:hover:text-[#00B4D8]">Все объявления</Link></li>
              <li><Link href="/favorites" className="text-[#6b7280] hover:text-[#00B4D8] dark:text-zinc-400 dark:hover:text-[#00B4D8]">Избранное</Link></li>
              <li><Link href="/messages" className="text-[#6b7280] hover:text-[#00B4D8] dark:text-zinc-400 dark:hover:text-[#00B4D8]">Сообщения</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280] dark:text-zinc-400">
              Продавцам
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/new" className="text-[#6b7280] hover:text-[#00B4D8] dark:text-zinc-400 dark:hover:text-[#00B4D8]">Разместить объявление</Link></li>
              <li><Link href="/profile" className="text-[#6b7280] hover:text-[#00B4D8] dark:text-zinc-400 dark:hover:text-[#00B4D8]">Личный кабинет</Link></li>
              <li><Link href="/profile/settings" className="text-[#6b7280] hover:text-[#00B4D8] dark:text-zinc-400 dark:hover:text-[#00B4D8]">Настройки</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280] dark:text-zinc-400">
              Информация
            </p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-1.5 text-[#6b7280] dark:text-zinc-400">
                <CheckCircle size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                Безопасность
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280] dark:text-zinc-400">
                <HelpCircle size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                Помощь
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280] dark:text-zinc-400">
                <Building2 size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                О компании
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280] dark:text-zinc-400">
                <FileText size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                Правила
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6">
          <p className="text-xs text-[#6b7280] dark:text-zinc-500">
            © {new Date().getFullYear()} Barter. Все права защищены.
          </p>
          <div className="flex items-center gap-3 text-xs text-[#6b7280] dark:text-zinc-500">
            <Link href="/auth" className="hover:text-[#00B4D8] dark:hover:text-[#00B4D8]">Вход</Link>
            <span>·</span>
            <Link href="/auth?mode=register" className="hover:text-[#00B4D8] dark:hover:text-[#00B4D8]">Регистрация</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
