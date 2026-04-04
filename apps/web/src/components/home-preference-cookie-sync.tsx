'use client';

import { useEffect } from 'react';

type Props = {
  city: string;
  categoryId: string;
};

export function HomePreferenceCookieSync({ city, categoryId }: Props) {
  useEffect(() => {
    if (city.trim()) {
      document.cookie = `barter_pref_city=${encodeURIComponent(city.trim())}; path=/; max-age=15552000; samesite=lax`;
    }
    if (categoryId.trim()) {
      document.cookie = `barter_pref_category=${encodeURIComponent(categoryId.trim())}; path=/; max-age=15552000; samesite=lax`;
    } else {
      // Сброс, чтобы «Все категории» в URL не подтягивала старую категорию из cookie
      document.cookie = 'barter_pref_category=; path=/; max-age=0; samesite=lax';
    }
  }, [city, categoryId]);

  return null;
}

