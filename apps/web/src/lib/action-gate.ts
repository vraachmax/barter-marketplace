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
