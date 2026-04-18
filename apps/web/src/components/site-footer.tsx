import Link from 'next/link';
import { Building2, CheckCircle, FileText, HelpCircle } from 'lucide-react';

const s = 1.8;

export function SiteFooter() {
  return (
    <footer className="bg-card py-8">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-bold text-[#1a1a1a]">Barter</p>
            <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">
              Маркетплейс объявлений по всей России. Покупайте и продавайте легко.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
              Покупателям
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/" className="text-[#6b7280] hover:text-[#007AFF]">Все объявления</Link></li>
              <li><Link href="/favorites" className="text-[#6b7280] hover:text-[#007AFF]">Избранное</Link></li>
              <li><Link href="/messages" className="text-[#6b7280] hover:text-[#007AFF]">Сообщения</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
              Продавцам
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/new" className="text-[#6b7280] hover:text-[#007AFF]">Разместить объявление</Link></li>
              <li><Link href="/profile" className="text-[#6b7280] hover:text-[#007AFF]">Личный кабинет</Link></li>
              <li><Link href="/profile/settings" className="text-[#6b7280] hover:text-[#007AFF]">Настройки</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280]">
              Информация
            </p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-1.5 text-[#6b7280]">
                <CheckCircle size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                Безопасность
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280]">
                <HelpCircle size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                Помощь
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280]">
                <Building2 size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                О компании
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280]">
                <FileText size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                Правила
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6">
          <p className="text-xs text-[#6b7280]">
            © {new Date().getFullYear()} Barter. Все права защищены.
          </p>
          <div className="flex items-center gap-3 text-xs text-[#6b7280]">
            <Link href="/auth" className="hover:text-[#007AFF]">Вход</Link>
            <span>·</span>
            <Link href="/auth?mode=register" className="hover:text-[#007AFF]">Регистрация</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
