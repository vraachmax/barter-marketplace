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
              ÐÐ°ÑÐºÐµÑÐ¿Ð»ÐµÐ¹Ñ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ð¹ Ð¿Ð¾ Ð²ÑÐµÐ¹ Ð Ð¾ÑÑÐ¸Ð¸. ÐÐ¾ÐºÑÐ¿Ð°Ð¹ÑÐµ Ð¸ Ð¿ÑÐ¾Ð´Ð°Ð²Ð°Ð¹ÑÐµ Ð»ÐµÐ³ÐºÐ¾.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280] dark:text-zinc-400">
              ÐÐ¾ÐºÑÐ¿Ð°ÑÐµÐ»ÑÐ¼
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/" className="text-[#6b7280] hover:text-[#007AFF] dark:text-zinc-400 dark:hover:text-[#007AFF]">ÐÑÐµ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ñ</Link></li>
              <li><Link href="/favorites" className="text-[#6b7280] hover:text-[#007AFF] dark:text-zinc-400 dark:hover:text-[#007AFF]">ÐÐ·Ð±ÑÐ°Ð½Ð½Ð¾Ðµ</Link></li>
              <li><Link href="/messages" className="text-[#6b7280] hover:text-[#007AFF] dark:text-zinc-400 dark:hover:text-[#007AFF]">Ð¡Ð¾Ð¾Ð±ÑÐµÐ½Ð¸Ñ</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280] dark:text-zinc-400">
              ÐÑÐ¾Ð´Ð°Ð²ÑÐ°Ð¼
            </p>
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/new" className="text-[#6b7280] hover:text-[#007AFF] dark:text-zinc-400 dark:hover:text-[#007AFF]">Ð Ð°Ð·Ð¼ÐµÑÑÐ¸ÑÑ Ð¾Ð±ÑÑÐ²Ð»ÐµÐ½Ð¸Ðµ</Link></li>
              <li><Link href="/profile" className="text-[#6b7280] hover:text-[#007AFF] dark:text-zinc-400 dark:hover:text-[#007AFF]">ÐÐ¸ÑÐ½ÑÐ¹ ÐºÐ°Ð±Ð¸Ð½ÐµÑ</Link></li>
              <li><Link href="/profile/settings" className="text-[#6b7280] hover:text-[#007AFF] dark:text-zinc-400 dark:hover:text-[#007AFF]">ÐÐ°ÑÑÑÐ¾Ð¹ÐºÐ¸</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6b7280] dark:text-zinc-400">
              ÐÐ½ÑÐ¾ÑÐ¼Ð°ÑÐ¸Ñ
            </p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-1.5 text-[#6b7280] dark:text-zinc-400">
                <CheckCircle size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                ÐÐµÐ·Ð¾Ð¿Ð°ÑÐ½Ð¾ÑÑÑ
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280] dark:text-zinc-400">
                <HelpCircle size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                ÐÐ¾Ð¼Ð¾ÑÑ
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280] dark:text-zinc-400">
                <Building2 size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                Ð ÐºÐ¾Ð¼Ð¿Ð°Ð½Ð¸Ð¸
              </li>
              <li className="flex items-center gap-1.5 text-[#6b7280] dark:text-zinc-400">
                <FileText size={16} strokeWidth={s} className="shrink-0" aria-hidden />
                ÐÑÐ°Ð²Ð¸Ð»Ð°
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-6">
          <p className="text-xs text-[#6b7280] dark:text-zinc-500">
            Â© {new Date().getFullYear()} Barter. ÐÑÐµ Ð¿ÑÐ°Ð²Ð° Ð·Ð°ÑÐ¸ÑÐµÐ½Ñ.
          </p>
          <div className="flex items-center gap-3 text-xs text-[#6b7280] dark:text-zinc-500">
            <Link href="/auth" className="hover:text-[#007AFF] dark:hover:text-[#007AFF]">ÐÑÐ¾Ð´</Link>
            <span>Â·</span>
            <Link href="/auth?mode=register" className="hover:text-[#007AFF] dark:hover:text-[#007AFF]">Ð ÐµÐ³Ð¸ÑÑÑÐ°ÑÐ¸Ñ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
