import type { Container } from '../index.js';

/**
 * Пробегается по `di.records` и ищет те, у кого `record.lazy = true`.
 * Вызывает `record.factory()` один раз, чтобы дождаться промиса
 * и «разблокировать» последующие вызовы.
 */
export async function resolveLazyProvidersPhase(di: Container) {
  const promises: Promise<void>[] = [];

  // @ts-expect-error (если вы используете TS 4.4+ можно убрать)
  for (const [, record] of di.records) {
    if (record.lazy && typeof record.factory === 'function') {
      // Предполагаем, что factory() при первом вызове вернёт Promise< (deps: ...) => instance >.
      // Тогда "ждём" этот Promise и обновляем factory
      const p = Promise.resolve(record.factory(undefined as any)).then((resolvedFactory: any) => {
        // resolvedFactory – это функция (deps) => instance
        // Сохраняем в record.factory, чтобы дальше всё было как «синхронное»
        record.factory = resolvedFactory;
      });
      promises.push(p);
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}
