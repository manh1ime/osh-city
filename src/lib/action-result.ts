/**
 * Общий результат server action и защита от «молчаливых» падений.
 *
 * Server action, который бросает исключение, на клиенте превращается в
 * необработанный reject: пользователь не видит ни ошибки, ни результата.
 * Поэтому каждое действие оборачиваем и всегда возвращаем структурированный ответ.
 */
export type ActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
} & Partial<T>;

/** Сообщение, которое безопасно показать пользователю. */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    // Наши собственные сообщения («Не авторизован», «Недостаточно прав» и т.п.)
    // рассчитаны на пользователя. Всё остальное скрываем.
    if (error.message.length <= 200 && /[А-Яа-я]/.test(error.message)) {
      return error.message;
    }
  }
  return "Не удалось выполнить действие. Обновите страницу и попробуйте ещё раз.";
}

/**
 * Выполняет тело действия и превращает любое исключение в понятный результат.
 * Ошибки Next.js для redirect/notFound пробрасываются дальше без изменений.
 */
export async function runAction<T extends { ok: boolean; error?: string }>(
  task: () => Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await task();
  } catch (error) {
    // redirect() и notFound() внутри Next.js реализованы через исключения.
    const digest = (error as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && /^(NEXT_REDIRECT|NEXT_NOT_FOUND)/.test(digest)) {
      throw error;
    }
    console.error("SERVER_ACTION_ERROR", error);
    return { ok: false, error: actionErrorMessage(error) };
  }
}
