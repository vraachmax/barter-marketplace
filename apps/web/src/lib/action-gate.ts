/** Lock is acquired synchronously, before React can render a disabled button. */
export function createActionGate() {
  let busy = false;
  return {
    async run(action: () => Promise<void>): Promise<boolean> {
      if (busy) return false;
      busy = true;
      try {
        await action();
        return true;
      } finally {
        busy = false;
      }
    },
  };
}

export function actionErrorMessage(status: number): string {
  if (status === 401) return 'Сессия истекла. Войдите снова, чтобы продолжить.';
  if (status === 403) return 'Недостаточно прав для этого действия.';
  if (status === 404) return 'Объявление больше недоступно. Обновите список.';
  if (status === 400 || status === 422) return 'Проверьте заполненные поля и допустимость действия для этого объявления.';
  if (status === 429) return 'Слишком много запросов. Подождите немного и повторите действие.';
  return 'Не удалось подтвердить результат. Обновите список перед повторной попыткой.';
}

export type ListingActionState = {
  busy: boolean;
  notice: string;
  error: boolean;
  needsLogin: boolean;
};

export const initialListingActionState: ListingActionState = {
  busy: false, notice: '', error: false, needsLogin: false,
};

/** A confirmed mutation stays successful even if refreshing the list fails. */
export function createListingActionRunner() {
  const gate = createActionGate();
  return async function run(options: {
    request: () => Promise<{ ok: true } | { ok: false; status: number }>;
    refresh: () => Promise<boolean>;
    onState: (state: ListingActionState) => void;
    onSuccess?: () => void;
  }): Promise<boolean> {
    let saved = false;
    await gate.run(async () => {
      let state: ListingActionState = {
        busy: true, notice: 'Сохраняем изменения…', error: false, needsLogin: false,
      };
      options.onState(state);
      try {
        const result = await options.request();
        if (!result.ok) {
          state = { ...state, error: true, needsLogin: result.status === 401, notice: actionErrorMessage(result.status) };
          return;
        }
        saved = true;
        options.onSuccess?.();
        state = { ...state, notice: 'Изменения сохранены. Обновляем список…' };
        options.onState(state);
        const refreshed = await options.refresh();
        state = {
          ...state,
          error: !refreshed,
          notice: refreshed ? 'Изменения сохранены.' : 'Изменения сохранены, но список не загрузился. Обновите список.',
        };
      } catch {
        state = {
          ...state, error: true,
          notice: saved
            ? 'Изменения сохранены, но список не загрузился. Обновите список.'
            : actionErrorMessage(0),
        };
      } finally {
        options.onState({ ...state, busy: false });
      }
    });
    return saved;
  };
}
