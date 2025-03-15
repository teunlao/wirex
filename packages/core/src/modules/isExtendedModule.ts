import type { ExtendedModule, ModuleType } from './module.h.js';

export const isExtendedModule = (module: ModuleType | ExtendedModule): module is ExtendedModule => {
  return !!(module as any).mainModule;
};
