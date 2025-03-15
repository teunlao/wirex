import type { Provider } from '../IProvider.js';
import type { ModuleOptions } from './module.h.js';

export const MODULE_METADATA = '_module_metadata_';

export function Module<Providers extends Provider[]>(options: ModuleOptions<Providers>): any {
  function attachMetadata(cls: Function) {
    return Object.assign(cls, {
      [MODULE_METADATA]: {
        ...options,
        deps: options.deps ?? {},
        id: `${cls.name}-${Math.random()}`,
        name: cls.name,
        lazy: options.lazy ?? false,
      },
    });
  }

  return function universalDecorator(value: Function, context?: ClassDecoratorContext) {
    if (!context) {
      return attachMetadata(value);
    }

    if (context.kind !== 'class') {
      throw new Error('Module decorator can be used only on classes');
    }
    Reflect.defineProperty(value, MODULE_METADATA, {
      configurable: true,
      value: {
        ...options,
        deps: options.deps ?? {},
        id: `${value.name}-${Math.random()}`,
        name: value.name,
        lazy: options.lazy ?? false,
      },
    });
  };
}
