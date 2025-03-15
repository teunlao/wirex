import type { Container } from '../Container.js';
import type { Provider, ProviderDeps } from '../IProvider.js';
import type { BaseTokenInterface } from '../createToken/createToken.js';
import { MODULE_METADATA } from './module.js';

export interface ModuleOptions<Providers extends Provider[]> {
  providers: Providers;
  deps?: ProviderDeps;
  imports?: ModuleType[];
  canActivate?: (di: Container) => boolean;
  loader?: ModuleLoader;
  lazy?: boolean;
}
export type ModuleLoaderResult = any | { providers: Provider[] };

export type ModuleLoader = {
  provideIn?: string | BaseTokenInterface;
  handler: () => Promise<ModuleLoaderResult>;
  throwOnError?: boolean;
};

export interface ModuleParameters {
  providers: Provider[];
  deps: ProviderDeps;
  imports?: ModuleType[];
  id: string;
  name: string;
  loader?: ModuleLoader;
  lazy?: boolean;
  canActivate?: (di: Container) => boolean;
}

export interface ModuleSecretParameters {
  [MODULE_METADATA]: ModuleParameters;
}

export type ExtendedModule = {
  mainModule: ModuleType;
  providers?: Provider[];
  imports?: ModuleType[];
};

export interface ModuleClass {
  new (...args: any[]): any;
}

// ts can't mutate the type for class decorators, so we add Partial
// https://github.com/microsoft/TypeScript/issues/4881
export type ModuleType<Class extends ModuleClass = ModuleClass> = Class & Partial<ModuleSecretParameters>;
export type ModuleConstructor = <Class extends ModuleClass = ModuleClass>(target: Class) => ModuleType<Class>;
