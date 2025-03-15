import { isExtendedModule } from './isExtendedModule.js';
import type { ExtendedModule, ModuleParameters, ModuleType } from './module.h.js';
import { MODULE_METADATA } from './module.js';

export const getModuleParameters = (module: ModuleType | ExtendedModule) => {
  let moduleParameters: ModuleParameters;

  if (isExtendedModule(module)) {
    const main = module.mainModule[MODULE_METADATA] as ModuleParameters;
    moduleParameters = { ...main };
    moduleParameters.providers = moduleParameters.providers.concat(module.providers || []);
    // imports not a required parameter
    const importsParam = moduleParameters.imports || [];
    moduleParameters.imports = importsParam.concat(module.imports || []);
  } else {
    moduleParameters = module[MODULE_METADATA] as ModuleParameters;
  }

  return moduleParameters;
};
