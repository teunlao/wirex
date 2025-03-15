import type { DepsIterator, Provider, ScopeVariants } from './IProvider.js';

export interface RecordProvide<T> {
  factory: ((deps: DepsIterator<any>) => T) | undefined;
  multi: any[] | undefined;
  resolvedDeps: Record<string, Provider>;
  scope: ScopeVariants;
  stack?: string;
  staticValue?: boolean;
  lazy: boolean;
}
