import type { ExtendedModule, ModuleType } from './module.h.js';
import { MODULE_METADATA } from './module.js';

export const isValidModule = (module: ModuleType | ExtendedModule): module is ModuleType | ExtendedModule => {
  // If we have undefined or null
  if (Boolean(module) === false) return false;
  // If it is a module
  if (MODULE_METADATA in module) return true;
  // If it is a module that extends another module
  if ('mainModule' in module) return isValidModule(module.mainModule);
  return false;
};
