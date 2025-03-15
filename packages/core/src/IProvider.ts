import type {
  ExtractDependencyType,
  ExtractTokenType,
  OptionalTokenDependency,
  TokenInterface,
} from './createToken/createToken.js';

export type Target = TokenInterface<unknown> | string | any;
export type ScopeVariants = 'request' | 'singleton' | 'transient';

export interface ProviderOptions {
  token: Target;
  optional?: boolean;
  multi?: boolean;
}

export type ProviderDep = Target | OptionalTokenDependency<Target> | ProviderOptions;

export type ProviderDeps = ProviderDep[] | Record<string, ProviderDep>;

type MultiEnhance<M extends boolean | undefined, V> = M extends true ? V[] : V;
type OptionalEnhance<O extends boolean | undefined, V> = O extends true ? V | null : V;

type OptionsType<TokenVal, M extends boolean | undefined, O extends boolean | undefined> = OptionalEnhance<
  O,
  MultiEnhance<M, ExtractDependencyType<TokenVal>>
>;

export type DepsIterator<T> = T extends (infer U)[]
  ? {
      [K in keyof T]: T[K] extends OptionalTokenDependency<infer OT>
        ? ExtractDependencyType<OT> | null
        : T[K] extends TokenInterface<unknown>
          ? ExtractDependencyType<T[K]>
          : T[K] extends string
            ? unknown
            : T[K] extends { token: infer TT; optional?: infer OO; multi?: infer MM }
              ? OptionsType<TT, MM & (boolean | undefined), OO & (boolean | undefined)>
              : ExtractDependencyType<T[K]>;
    }
  : T extends Record<string, any>
    ? {
        [K in keyof T]: T[K] extends OptionalTokenDependency<infer OT2>
          ? ExtractDependencyType<OT2> | null
          : T[K] extends TokenInterface<unknown>
            ? ExtractDependencyType<T[K]>
            : T[K] extends string
              ? unknown
              : T[K] extends { token: infer TT2; optional?: infer OO2; multi?: infer MM2 }
                ? OptionsType<TT2, MM2 & (boolean | undefined), OO2 & (boolean | undefined)>
                : ExtractDependencyType<T[K]>;
      }
    : never;

export type ProviderReturn<P extends Target> = P extends TokenInterface<unknown>
  ? ExtractTokenType<P>
  : P extends string
    ? unknown
    : P;

interface BaseProvider<P extends Target> {
  provide: P extends TokenInterface<unknown> ? P : Target;
  scope?: ScopeVariants;
  multi?: boolean;
  eager?: boolean;
}

export interface ValueProvider<P extends Target> extends BaseProvider<P> {
  useValue: ProviderReturn<P>;
}

export interface ClassProviderWithoutDeps<P extends Target> extends BaseProvider<P> {
  useClass: new () => ProviderReturn<P>;
}

export interface ClassProviderWithDeps<Deps, P extends Target> extends BaseProvider<P> {
  deps: Deps;
  useClass: Deps extends any[]
    ? new (
        ...args: DepsIterator<Deps>
      ) => ProviderReturn<P>
    : new (
        arg: DepsIterator<Deps>,
      ) => ProviderReturn<P>;
}

export type ClassProvider<Deps, P extends Target> = ClassProviderWithoutDeps<P> | ClassProviderWithDeps<Deps, P>;

export interface FactoryProviderWithoutDeps<P extends Target> extends BaseProvider<P> {
  useFactory: () => ProviderReturn<P>;
}

export interface FactoryProviderWithDeps<Deps, P extends Target> extends BaseProvider<P> {
  deps: Deps;
  useFactory: Deps extends any[]
    ? (...args: DepsIterator<Deps>) => ProviderReturn<P>
    : (arg: DepsIterator<Deps>) => ProviderReturn<P>;
}

export type FactoryProvider<Deps, P extends Target> = FactoryProviderWithoutDeps<P> | FactoryProviderWithDeps<Deps, P>;

export type Provider<Deps = any, P extends Target = any> =
  | ValueProvider<P>
  | ClassProvider<Deps, P>
  | FactoryProvider<Deps, P>;

export type UseValueType<P extends Target> = ProviderReturn<P>;
