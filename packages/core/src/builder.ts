// define-builder-example.ts

import type { TokenInterface } from './createToken/createToken.js';

/**
 * 1) Базовые типы (Target, ScopeVariants, etc.), упрощённая версия
 */
export type Target = TokenInterface<unknown> | string;
export type ScopeVariants = 'request' | 'singleton' | 'transient';

type ExtractTokenType<T> = T extends TokenInterface<infer U> ? U : never;

/**
 * 2) Класс, который будем проверять
 *    new (...args: infer P) => any => P — массив типов конструктора
 */
type CtorParams<C> = C extends new (...args: infer P) => any ? P : never;

/**
 * 3) Мини‐DI провайдер ClassProvider
 */
export interface ClassProvider<Deps, P extends Target> {
  provide: P;
  useClass: new (...args: Deps extends readonly any[] ? Deps : never) => any;
  deps: Deps;
  scope?: ScopeVariants;
  eager?: boolean;
}

/**
 * 4) Наша функция define — пока оставим только .classChain(...)
 *    Плюс методы .class, .provider, etc. (заглушки)
 */
export interface DefineFunction {
  // Заглушка “старого” define.class(...) для примера
  class<P extends Target>(token: P, cls: new (...args: any) => any): ClassProvider<any, P>;

  // Показательный builder:
  classChain<P extends Target, C extends new (...args: any[]) => any>(token: P, cls: C): BuilderZeroOrParams<P, C>;

  // Можно добавить .provider() и т. д.
}

/**
 * 5) Собственно builder-интерфейсы:
 *    - Если класс C не имеет аргументов, вернём "BuilderZeroParams"
 *    - Если класс C имеет аргументы, вернём "BuilderWithParams"
 */

// Проверка, есть ли у класса 0 аргументов
type HasNoParams<C> = CtorParams<C> extends [] ? true : false;

// Создаём общий “BuilderZeroOrParams” (стартовая точка)
type BuilderZeroOrParams<P extends Target, C extends new (...args: any[]) => any> = HasNoParams<C> extends true
  ? BuilderZeroParams<P, C> // Класс без аргументов
  : BuilderWithParams<P, C, never>; // Класс с аргументами (мы ещё не указали deps)

/**
 * 5a) Интерфейс "BuilderZeroParams" — класс с 0 аргументов,
 *     значит .deps(...) вызывать нельзя!
 */
interface BuilderZeroParams<P extends Target, C extends new () => any> {
  scope(scope: ScopeVariants): BuilderZeroParams<P, C>;
  eager(eager: boolean): BuilderZeroParams<P, C>;

  // done() => ClassProvider<[], P>
  done(): ClassProvider<[], P>;
}

/**
 * 5b) Интерфейс "BuilderWithParams" — класс, у которого есть >=1 аргумент
 *     и мы обязаны позвать .deps(...) ровно 1 раз, чтобы указать массив deps.
 */
interface BuilderWithParams<P extends Target, C extends new (...args: any[]) => any, D> {
  /**
   * deps(...) — указываем зависимости (массив).
   *   После того, как мы указали deps, TS сверяет: DepsIterator === CtorParams<C>?
   */
  deps<D2 extends any[]>(deps: CheckDepsMatch<C, D2>): BuilderWithParamsDone<P, C, D2>;

  // Если .deps(...) ещё не вызван, нельзя делать done(), потому что аргументы не заданы.
  // Можем либо запретить, либо вернуть неполный провайдер. Выберем запретить:
  done(): never;
}

/**
 * 5c) "BuilderWithParamsDone" — состояние после того, как задали deps,
 *     теперь можно менять scope, eager, и наконец вызывать .done().
 */
interface BuilderWithParamsDone<P extends Target, C extends new (...args: any[]) => any, D extends any[]> {
  scope(scope: ScopeVariants): BuilderWithParamsDone<P, C, D>;
  eager(eager: boolean): BuilderWithParamsDone<P, C, D>;

  // done(): ClassProvider<D, P>
  done(): ClassProvider<D, P>;
}

/**
 * 6) Проверка, что D2 совпадает с CtorParams<C> (в обе стороны)
 */
type CheckDepsMatch<C, D extends any[]> = D extends CtorParams<C> ? (CtorParams<C> extends D ? D : never) : never;

/**
 * 7) Реализация builder объектов.
 *    Нам нужны классы/функции, которые будут хранить промежуточное состояние
 *    (token, cls, deps?, scope?, eager?).
 */

// Класс-билдер для case: 0 аргументов
class ClassBuilderZeroParams<P extends Target, C extends new () => any> implements BuilderZeroParams<P, C> {
  private scopeValue?: ScopeVariants;
  private eagerValue?: boolean;

  constructor(
    private token: P,
    private cls: C,
  ) {}

  scope(scope: ScopeVariants): this {
    this.scopeValue = scope;
    return this;
  }

  eager(eager: boolean): this {
    this.eagerValue = eager;
    return this;
  }

  done(): ClassProvider<[], P> {
    return {
      provide: this.token,
      useClass: this.cls,
      deps: [],
      scope: this.scopeValue,
      eager: this.eagerValue,
    };
  }
}

// Класс-билдер для case: есть аргументы, но deps не заданы
class ClassBuilderWithParams<P extends Target, C extends new (...args: any[]) => any>
  implements BuilderWithParams<P, C, never>
{
  constructor(
    private token: P,
    private cls: C,
  ) {}

  deps<D2 extends any[]>(deps: CheckDepsMatch<C, D2>): BuilderWithParamsDone<P, C, D2> {
    // Переходим на фазу, где deps уже заданы
    return new ClassBuilderWithParamsDone<P, C, D2>(this.token, this.cls, deps);
  }

  done(): never {
    throw new Error('Cannot call done() before .deps(...) for classes with constructor arguments.');
  }
}

// Класс-билдер для case: есть аргументы, и deps уже заданы
class ClassBuilderWithParamsDone<P extends Target, C extends new (...args: any[]) => any, D extends any[]>
  implements BuilderWithParamsDone<P, C, D>
{
  private scopeValue?: ScopeVariants;
  private eagerValue?: boolean;

  constructor(
    private token: P,
    private cls: C,
    private depsArray: D,
  ) {}

  scope(scope: ScopeVariants): this {
    this.scopeValue = scope;
    return this;
  }

  eager(eager: boolean): this {
    this.eagerValue = eager;
    return this;
  }

  done(): ClassProvider<D, P> {
    return {
      provide: this.token,
      useClass: this.cls,
      deps: this.depsArray,
      scope: this.scopeValue,
      eager: this.eagerValue,
    };
  }
}

/**
 * 8) Наконец, само "define" со всем API
 */
const defineBuilder: DefineFunction = {
  // Просто пример старого define.class(...)
  class<P extends Target>(token: P, cls: new (...args: any) => any) {
    return {
      provide: token,
      useClass: cls,
      deps: [],
    };
  },

  // Наш fluent builder
  classChain<P extends Target, C extends new (...args: any[]) => any>(token: P, cls: C): BuilderZeroOrParams<P, C> {
    // Проверим, есть ли у cls нулевой конструктор
    type Params = CtorParams<C>;
    type IsZero = Params extends [] ? true : false;

    if (([] as unknown as Params).length === 0) {
      // TS-вычислительный трюк: HasNoParams<C>
      // Но на рантайме может быть сложновато, мы упростим
    }
    // Создадим либо ClassBuilderZeroParams, либо ClassBuilderWithParams
    type BuilderResult = BuilderZeroOrParams<P, C>;
    const ctorLen = (cls as any).length;
    // В JS .length у функции = числу params, если не притуплено,
    // но для стрелок/optional/деструктур параметров может быть не точно.
    // Упрощаем.

    if (ctorLen === 0) {
      // @ts-expect-error (просто чтобы угодить типам)
      return new ClassBuilderZeroParams(token, cls) as BuilderResult;
    }
    return new ClassBuilderWithParams(token, cls) as unknown as BuilderResult;
  },
};

// Экспортируем define
export { defineBuilder };
