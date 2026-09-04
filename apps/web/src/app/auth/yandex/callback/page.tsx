"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Card } from "@/components/ui/card";

const errors: Record<string, string> = {
  access_denied: "Вход через Яндекс отменён.",
  invalid_state: "Сессия входа устарела. Попробуйте ещё раз.",
  exchange_failed: "Яндекс не подтвердил вход. Попробуйте ещё раз.",
};

export default function YandexCallbackPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error");
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("token");

    if (providerError || !token) {
      queueMicrotask(() =>
        setError(errors[providerError ?? ""] ?? "Не удалось завершить вход."),
      );
      return;
    }

    window.history.replaceState(null, "", "/auth/yandex/callback");
    void login(token).then(() => window.location.replace("/"));
  }, [login]);

  return (
    <div className="grid min-h-screen place-items-center bg-muted px-4 text-foreground">
      <Card className="w-full max-w-sm p-6 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-bold">Не получилось войти</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link
              className="mt-5 inline-block font-semibold text-primary"
              href="/auth"
            >
              Вернуться ко входу
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[#fc3f1d] text-xl font-black text-white">
              Я
            </div>
            <h1 className="mt-3 text-lg font-bold">Входим через Яндекс…</h1>
          </>
        )}
      </Card>
    </div>
  );
}
