import type { RecordProvide } from './IContainer.js';
import type { DepsIterator, Provider, ProviderDep, ProviderDeps, ScopeVariants } from './IProvider.js';
import { Errors, Scope } from './constant.js';
import { createError } from './createError.js';
import type { BaseTokenInterface, MultiTokenInterface, OptionalTokenDependency } from './createToken/createToken.js';
import { tokenToString } from './createToken/createToken.js';
import { DI_TOKEN } from './tokens.js';

/**
 * Маркер, который указывает, что значение ещё не создано. Для проверки по ссылке.
 */
export const NOT_YET = '__NOT_YET__MARKER';

/**
 * Маркер, который указывает, что создание значения находится в процессе вызова.
 *
 * Если при создании дочерних зависимостей обнаружим CIRCULAR, значит есть кольцевая зависимость.
 */
const CIRCULAR = '__CIRCULAR__MARKER';

/** Преобразуем токен в symbol для хранения в Map. */
function tokenToKey(token: any): symbol {
  return token.name;
}

/** Дополним сообщение об ошибке stack-трейсом и токеном */
function proxyHydrationError(token: symbol, e: Record<string, unknown>) {
  const name = tokenToString(token);

  if (!e.__extendedWithStack) {
    e.__extendedWithStack = true;
    e.message = `${e.message} at "${name}"`;
  } else {
    e.message += ` < ${name}`;
  }

  if (Object.hasOwnProperty.call(e, 'stack') && typeof e.stack === 'string') {
    e.stack = e.stack.replace(/^.+\n/, `${e.name}: ${e.message}\n`);
  }

  throw e;
}

/** Проверка, что если токен мульти, то провайдер тоже имеет multi=true */
function checkIfProviderMatchToken(provider: Provider) {
  if (typeof provider.provide === 'string') {
    return;
  }

  const tokenOptions = provider.provide.options;
  if (tokenOptions?.multi && !provider.multi) {
    throw createError(`Token ${provider.provide.toString()} require multi providers`, {
      type: Errors.REQUIRE_MULTI,
      stack: (provider as any).__stack,
    });
  }
}

/** Проверка базовой структуры провайдера */
function checkValidateInterfaceProvider(provider: Provider) {
  if (
    !provider ||
    !provider.provide ||
    ((provider as any).useValue === undefined &&
      (provider as any).useClass === undefined &&
      (provider as any).useFactory === undefined)
  ) {
    throw createError(
      `Invalid provider. Check what is passed to the DI. Current value is not a provider: ${JSON.stringify(
        provider,
        (k, v) => (v === undefined ? 'undefined' : v),
      )}`,
      {
        type: Errors.WRONG_FORMAT,
        stack: (provider as any)?.__stack,
      },
    );
  }
}

/** Если запись не найдена, выбросим ошибку (или вернём null, если optional) */
function checkFound(record: RecordProvide<any> | undefined, token: symbol) {
  if (record === undefined) {
    const name = tokenToString(token);
    throw createError(`Token not found "${name}"`, {
      type: Errors.NOT_FOUND,
    });
  }
}

/** Проверка на кольцевую зависимость */
function checkCircularDeps(record: RecordProvide<any>, token: symbol, value: any) {
  if (value === CIRCULAR) {
    const name = tokenToString(token);
    throw createError(`Circular dep for "${name}"`, {
      type: Errors.CIRCULAR_DEP,
      stack: record.stack,
    });
  }
}

/** Создаём запись RecordProvide<T> */
function makeRecord<T>(
  factory: ((deps: DepsIterator<any>) => T) | undefined,
  resolvedDeps: Record<string, Provider>,
  scope: ScopeVariants,
  multi: boolean,
  stack?: string,
  staticValue?: boolean,
  lazy?: boolean,
): RecordProvide<T> {
  return {
    factory,
    resolvedDeps,
    scope,
    multi: multi ? [] : undefined,
    stack,
    staticValue,
    lazy: lazy ?? false,
  };
}

function providerToRecord<T>(provider: Provider): RecordProvide<T> {
  let factory: any;
  let resolvedDeps: any;
  let scope: ScopeVariants = provider.provide?.options?.scope ?? Scope.REQUEST;
  let staticValue = false;

  let lazy = false;

  // В любом из useValue / useClass / useFactory может прийти объект с { __lazy: true }
  const impl: any = (provider as any).useClass || (provider as any).useFactory || (provider as any).useValue;
  if (impl && typeof impl === 'object') {
    if (impl.__lazy) {
      lazy = true;
    }
  }

  // Определяем фабрику
  if ('useFactory' in provider) {
    factory = (deps: DepsIterator<any>) => {
      const instantiateFactory = (resolvedFactory: (...args: any[]) => T, deps: DepsIterator<any>) => {
        if (Array.isArray(deps)) {
          return resolvedFactory(...deps);
        }
        return resolvedFactory(deps);
      };

      if (lazy) {
        const importer = (provider as any).useFactory.importerFn as () => Promise<any>;
        return importer().then((resolvedFactory: any) => {
          return (deps: DepsIterator<any>) => instantiateFactory(resolvedFactory, deps);
        });
      }

      return instantiateFactory(provider.useFactory as any, deps);
    };

    if ('deps' in provider) {
      resolvedDeps = provider.deps;
    }
    if (provider.scope) {
      scope = provider.scope;
    }
  } else if ('useClass' in provider) {
    factory = (deps: DepsIterator<any>) => {
      const instantiateFactory = (resolvedClass: new (...args: any) => T, deps: DepsIterator<any>) => {
        if (Array.isArray(deps)) {
          return new resolvedClass(...deps);
        }
        return new resolvedClass(deps);
      };

      if (lazy) {
        // lazy async
        const importer = (provider as any).useClass.importerFn as () => Promise<any>;
        return importer().then((resolvedClass: any) => {
          return (deps: DepsIterator<any>) => instantiateFactory(resolvedClass, deps);
        });
      }

      return instantiateFactory(provider.useClass as any, deps);
    };

    if ('deps' in provider) {
      resolvedDeps = provider.deps;
    }
    if (provider.scope) {
      scope = provider.scope;
    }
  } else {
    // useValue
    factory = () => {
      if (lazy) {
        const importer = (provider as any).useValue.importerFn as () => Promise<any>;
        return importer().then((resolvedValue: any) => {
          return () => resolvedValue;
        });
      }

      return provider.useValue;
    };
    staticValue = true;
    if (provider.scope) {
      scope = provider.scope;
    }
  }

  return makeRecord<T>(factory, resolvedDeps, scope, false, (provider as any).__stack, staticValue, lazy);
}

/** Если провайдер — useValue, вернём значение, иначе NOT_YET */
function providerToValue<T>(provider: Provider): T | typeof NOT_YET {
  if ('useValue' in provider) {
    return provider.useValue;
  }
  return NOT_YET;
}

/** Основной класс Container (DI) */
export class Container {
  /** Map<symbol, RecordProvide> */
  protected records = new Map<symbol, RecordProvide<any>>();
  protected recordValues = new Map<RecordProvide<any>, any>();
  private readonly fallback?: Container;

  constructor(additionalProviders?: Provider[], fallback?: Container) {
    if (additionalProviders) {
      additionalProviders.forEach((provider) => this.register(provider));
    }
    this.fallback = fallback;

    // Зарегистрируем себя как DI_TOKEN
    this.register({
      provide: DI_TOKEN,
      useValue: this,
      scope: Scope.SINGLETON,
    });
  }

  get<T>(obj: {
    token: BaseTokenInterface<T>;
    optional: true;
    multi?: false;
  }): T | null;
  get<T>(obj: {
    token: BaseTokenInterface<T>;
    optional?: false;
    multi?: false;
  }): T;

  get<T>(obj: { token: MultiTokenInterface<T>; optional: true; multi?: true }): T[] | null;
  get<T>(obj: {
    token: MultiTokenInterface<T>;
    optional?: false;
    multi?: true;
  }): T[];

  get<T>(token: BaseTokenInterface<T>): T;
  get<T>(token: MultiTokenInterface<T>): T[];

  get<T>(obj: OptionalTokenDependency<T>): T | null;
  get<T>(token: T): T;

  get<T extends ProviderDep>(tokenORObject: T) {
    let token: any;
    let optional = false;
    let multi = false;

    if (typeof tokenORObject === 'string') {
      token = tokenORObject;
    } else if ('token' in (tokenORObject as any)) {
      token = (tokenORObject as any).token;
      optional = (tokenORObject as any).optional;
      multi = token.options?.multi || false;
    } else {
      token = tokenORObject;
    }

    token = tokenToKey(token);
    const record = this.getRecord(token);

    if (!record && this.fallback?.getRecord(token)) {
      return this.fallback.get(tokenORObject);
    }

    if (!record && optional) {
      if (multi) {
        return [];
      }
      return null;
    }

    checkFound(record, token);
    return this.hydrate(record as RecordProvide<T>, token, optional) as T;
  }

  /** Геттер, чтобы собрать deps (массив или объект) */
  getOfDeps<T extends ProviderDeps>(deps: T): DepsIterator<T> {
    if (Array.isArray(deps)) {
      return deps.map((dep) => this.get(dep)) as DepsIterator<T>;
    }
    const result = {} as any;
    for (const key in deps) {
      if (Object.prototype.hasOwnProperty.call(deps, key)) {
        result[key] = this.get(deps[key]);
      }
    }
    return result;
  }

  getRecord<T>(token: symbol) {
    return this.records.get(token) as RecordProvide<T> | undefined;
  }

  has(token: any) {
    return !!this.getRecord(tokenToKey(token));
  }

  /** Заимствуем токен из другого контейнера (если нет у нас). */
  borrowToken(from: Container, token: any) {
    const tokenKey = tokenToKey(token);
    if (!this.getRecord(tokenKey)) {
      const record = from.getRecord(tokenKey);
      if (record) {
        if (record.multi) {
          for (const multiRecord of record.multi) {
            this.recordValues.set(multiRecord, NOT_YET);
          }
        }
        this.records.set(tokenKey, record);
        this.recordValues.set(record, NOT_YET);
      }
    }
  }

  getValue<T>(record: RecordProvide<T>): T | typeof NOT_YET {
    return this.recordValues.get(record);
  }

  register<Deps, P = any>(provider: Provider<Deps, P>) {
    if (process.env.NODE_ENV !== 'production') {
      checkValidateInterfaceProvider(provider);
    }
    checkIfProviderMatchToken(provider);
    this.processProvider(provider);

    if (provider.eager) {
      this.get(provider.provide);
    }
  }

  processProvider(provider: Provider): void {
    const token = tokenToKey(provider.provide);
    const record = providerToRecord(provider);
    const value = providerToValue(provider);

    if (provider.provide.options?.multi || provider.multi) {
      let multiRecord = this.getRecord(token);
      if (multiRecord) {
        if (multiRecord.multi === undefined) {
          throw createError(`Mixed multi-provider for ${tokenToString(token)}`, {
            type: Errors.MIXED_MULTI,
            stack: (provider as any).__stack,
          });
        }
      } else {
        multiRecord = makeRecord(
          undefined,
          {},
          provider.scope || provider.provide.options.scope || Scope.REQUEST,
          true,
          (provider as any).__stack,
        );
        this.records.set(token, multiRecord);
        this.recordValues.set(multiRecord, NOT_YET);
      }
      (multiRecord.multi as any[]).push(record);
    } else {
      this.records.set(token, record);
    }

    this.recordValues.set(record, value);
  }

  protected hydrateDeps<T>(record: RecordProvide<T>) {
    return this.getOfDeps(record.resolvedDeps);
  }

  protected hydrate<T>(record: RecordProvide<T>, token: symbol, optional: boolean): T | null {
    if (record.scope === Scope.TRANSIENT) {
      try {
        return (record.factory as (deps: DepsIterator<any>) => T)(this.hydrateDeps(record));
      } catch (e: any) {
        if (optional && e.type === Errors.NOT_FOUND) {
          return null;
        }
        proxyHydrationError(
          token,
          Object.assign(e, {
            stack:
              !record.stack || /---- caused by: ----/g.test(e.stack)
                ? e.stack
                : `${e.stack}\n---- caused by: ----\n${record.stack || ''}`,
          }),
        );
      }
    }

    let value: any = this.getValue(record);
    checkCircularDeps(record, token, value);

    if (value !== NOT_YET) {
      return value;
    }

    if (record.multi) {
      this.recordValues.set(record, CIRCULAR);
      try {
        value = record.multi.map((rec) => this.hydrate(rec, token, false));
      } catch (e: any) {
        this.recordValues.set(record, NOT_YET);
        throw e;
      }
    } else {
      this.recordValues.set(record, CIRCULAR);
      try {
        value = (record.factory as (deps: DepsIterator<any>) => T)(this.hydrateDeps(record));
      } catch (e: any) {
        this.recordValues.set(record, NOT_YET);
        if (optional && e.type === Errors.NOT_FOUND) {
          return null;
        }
        proxyHydrationError(
          token,
          Object.assign(e, {
            stack:
              !record.stack || /---- caused by: ----/g.test(e.stack)
                ? e.stack
                : `${e.stack}\n---- caused by: ----\n${record.stack || ''}`,
          }),
        );
      }
    }

    this.recordValues.set(record, value);
    return value as T;
  }
}
