import type {
  ClassProviderWithDeps,
  ClassProviderWithoutDeps,
  DepsIterator,
  FactoryProviderWithDeps,
  FactoryProviderWithoutDeps,
  ProviderDeps,
  ScopeVariants,
  Target,
  UseValueType,
  ValueProvider,
} from './IProvider.js';

type CtorParams<C> = C extends new (...args: infer P) => any ? P : never;

type CheckClassDepsMatch<C, D extends ProviderDeps> = DepsIterator<D> extends CtorParams<C>
  ? CtorParams<C> extends DepsIterator<D>
    ? D
    : never
  : never;

type HasNoParams<C> = CtorParams<C> extends [] ? true : false;

export interface ClassProvideOptions<C, D> {
  scope?: ScopeVariants;
  multi?: boolean;
  eager?: boolean;
  deps?: D;
}

export interface ProvideSignature {
  <P extends Target>(config: {
    target: P;
    useValue: UseValueType<P>;
    scope?: ScopeVariants;
    multi?: boolean;
    eager?: boolean;
    deps?: never;
  }): ValueProvider<P>;

  <P extends Target, C extends new () => UseValueType<P>>(config: {
    target: P;
    useClass: C;
    scope?: ScopeVariants;
    multi?: boolean;
    eager?: boolean;
    deps?: never;
  }): ClassProviderWithoutDeps<P>;

  <P extends Target, C extends new (...args: any[]) => UseValueType<P>, D extends ProviderDeps>(config: {
    target: P;
    useClass: C;
    deps: CheckClassDepsMatch<C, D>;
    scope?: ScopeVariants;
    multi?: boolean;
    eager?: boolean;
  }): ClassProviderWithDeps<D, P>;

  <P extends Target, D>(config: {
    target: P;
    useFactory: D extends readonly any[]
      ? (...args: DepsIterator<D>) => UseValueType<P>
      : (arg: DepsIterator<D>) => UseValueType<P>;
    deps: D;
    scope?: ScopeVariants;
    multi?: boolean;
    eager?: boolean;
  }): FactoryProviderWithDeps<D, P>;

  <P extends Target>(config: {
    target: P;
    useFactory: () => UseValueType<P>;
    scope?: ScopeVariants;
    multi?: boolean;
    eager?: boolean;
    deps?: never;
  }): FactoryProviderWithoutDeps<P>;
}

export interface ProvideFunction extends ProvideSignature {
  value: <P extends Target>(
    target: P,
    val: UseValueType<P>,
    opts?: { scope?: ScopeVariants; multi?: boolean; eager?: boolean },
  ) => ValueProvider<P>;

  class: {
    <P extends Target, C extends new () => UseValueType<P>>(
      target: P,
      useClass: C,
      options?: Omit<ClassProvideOptions<C, never>, 'deps'>,
    ): ClassProviderWithoutDeps<P>;

    <P extends Target, C extends new (...args: any[]) => UseValueType<P>, D extends ProviderDeps>(
      target: P,
      useClass: C,
      options: Omit<ClassProvideOptions<C, D>, 'deps'> & {
        deps: CheckClassDepsMatch<C, D>;
      },
    ): ClassProviderWithDeps<D, P>;
  };

  factory: {
    <P extends Target, D>(
      target: P,
      factory: D extends readonly any[]
        ? (...args: DepsIterator<D>) => UseValueType<P>
        : (arg: DepsIterator<D>) => UseValueType<P>,
      options: {
        deps: D;
        scope?: ScopeVariants;
        multi?: boolean;
        eager?: boolean;
      },
    ): FactoryProviderWithDeps<D, P>;

    <P extends Target>(
      target: P,
      factory: () => UseValueType<P>,
      options?: {
        scope?: ScopeVariants;
        multi?: boolean;
        eager?: boolean;
      },
    ): FactoryProviderWithoutDeps<P>;
  };
}

function provideImpl(config: any) {
  if (config && 'target' in config) {
    const { target, ...rest } = config;
    return { provide: target, ...rest };
  }
  return config;
}

function valueImpl<P extends Target>(
  target: P,
  val: UseValueType<P>,
  opts?: { scope?: ScopeVariants; multi?: boolean; eager?: boolean },
) {
  return {
    provide: target,
    useValue: val,
    ...opts,
  };
}

function classImpl<P extends Target>(
  target: P,
  useClass: any,
  opts?: { deps?: any; scope?: ScopeVariants; multi?: boolean; eager?: boolean },
) {
  return {
    provide: target,
    useClass,
    ...opts,
  };
}

function factoryImpl<P extends Target>(
  target: P,
  factory: any,
  opts?: { deps?: any; scope?: ScopeVariants; multi?: boolean; eager?: boolean },
) {
  return {
    provide: target,
    useFactory: factory,
    ...opts,
  };
}

const provide = provideImpl as ProvideFunction;
provide.value = valueImpl as ProvideFunction['value'];
provide.class = classImpl as ProvideFunction['class'];
provide.factory = factoryImpl as ProvideFunction['factory'];

export { provide };
