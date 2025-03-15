export type LazyLoader<T> = () => Promise<T>;

export function lazy<T>(importerFn: LazyLoader<T>) {
  return {
    __lazy: true,
    importerFn,
  } as T & { __lazy: true; importerFn: LazyLoader<T> };
}
