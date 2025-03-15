import type { ScopeVariants } from '../IProvider.js';

export interface TokenType<T> {
  name: symbol;
  options: TokenOptions;
  isToken: true;
  toString(): string;
}

export interface TokenOptions {
  multi?: boolean;
  scope?: ScopeVariants;
}
