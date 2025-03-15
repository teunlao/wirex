import { getModuleParameters } from './getModuleParameters.js';
import { isValidModule } from './isValidModule.js';
import type { ExtendedModule, ModuleType } from './module.h.js';

export const INVALID_MODULE_ERROR = 'An invalid module was passed in the list of modules';

export const walkOfModules = (modules: Array<ModuleType | ExtendedModule>, includeLazy = false) => {
  const result: typeof modules = [];
  const modulesIdInitialized = new Set<string>();
  const modulesNameInitialized = new Set<string>();

  const innerWalkOfModules = (module: ModuleType | ExtendedModule) => {
    if (!isValidModule(module)) {
      throw new Error(INVALID_MODULE_ERROR);
    }

    const moduleParameters = getModuleParameters(module);

    // Пропускаем ленивые модули, если includeLazy = false
    if (moduleParameters.lazy && !includeLazy) {
      return;
    }

    if (!modulesIdInitialized.has(moduleParameters.id)) {
      if (process.env.NODE_ENV !== 'production') {
        if (modulesNameInitialized.has(moduleParameters.name)) {
          console.error(
            `Module ${moduleParameters.id} has already been initialized. Possibly duplicate dependencies:`,
            module,
            moduleParameters,
          );
        }
      }

      modulesIdInitialized.add(moduleParameters.id);
      modulesNameInitialized.add(moduleParameters.name);

      if (moduleParameters.imports) {
        moduleParameters.imports.forEach((item) => {
          innerWalkOfModules(item);
        });
      }

      result.push(module);
    }
  };

  modules.forEach((mod) => {
    innerWalkOfModules(mod);
  });

  return result;
};
