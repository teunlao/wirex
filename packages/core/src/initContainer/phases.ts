import type { Container } from '../Container.js';

import type { Provider } from '../IProvider.js';

import { getModuleParameters } from '../modules/getModuleParameters.js';
import { isExtendedModule } from '../modules/isExtendedModule.js';
import type { ExtendedModule, ModuleParameters, ModuleType } from '../modules/module.h.js';
import { MODULE_METADATA } from '../modules/module.js';

export function walkOfProviders(di: Container, providers: Provider[]) {
  providers.forEach((provide) => {
    di.register(provide);
  });
}

export function resolveModuleDeps(module: ModuleType, di: Container) {
  const { deps } = module[MODULE_METADATA] as ModuleParameters;
  if (deps) {
    return di.getOfDeps(deps);
  }
}

// Создание экземпляров модулей
export function resolveModules(di: Container, modulesToResolve: Set<ModuleType>) {
  modulesToResolve.forEach((ModuleToResolve) => {
    // eslint-disable-next-line no-new
    new ModuleToResolve(resolveModuleDeps(ModuleToResolve, di));
  });
}

// Фильтрация неактивных модулей по canActivate
export function filterInactiveModules(modules: Array<ModuleType | ExtendedModule>, di: Container) {
  const activeModulesSet = new Set(modules);

  const removeModuleAndItsImports = (module: ModuleType | ExtendedModule) => {
    if (!activeModulesSet.has(module)) return;
    activeModulesSet.delete(module);
    const mp = getModuleParameters(module);
    if (mp.imports) {
      for (const im of mp.imports) {
        removeModuleAndItsImports(im);
      }
    }
  };

  for (const mod of modules) {
    const mp = getModuleParameters(mod);
    if (mp.canActivate && !mp.canActivate(di)) {
      removeModuleAndItsImports(mod);
    }
  }

  return modules.filter((m) => activeModulesSet.has(m));
}

// ---- Фазы инициализации (Pipeline Steps) ----

// Фаза 1: Запуск лоадеров, чтобы зарегистрировать токены до canActivate
export async function runLoaders(di: Container, modules: Array<ModuleType | ExtendedModule>) {
  for (const mod of modules) {
    const moduleParameters = getModuleParameters(mod);
    if (moduleParameters.loader?.handler) {
      try {
        const loadedResult = await moduleParameters.loader.handler();

        if (loadedResult && typeof loadedResult === 'object' && 'providers' in loadedResult) {
          // Если вернули { providers: [...] }, регистрируем все провайдеры
          const { providers } = loadedResult as { providers: Provider[] };
          providers.forEach((p) => di.register(p));
        } else if (loadedResult && moduleParameters.loader.provideIn) {
          di.register({
            provide: moduleParameters.loader.provideIn,
            useValue: loadedResult,
          });
        }
      } catch (err) {
        console.error(`Error while using module loader in ${moduleParameters.name}`, err);
        if (moduleParameters.loader.throwOnError) {
          throw err;
        }
      }
    }
  }
  return modules; // Возвращаем тот же список, лоадеры ничего не фильтруют
}

// Фаза 2: Фильтрация по canActivate
export async function applyCanActivate(di: Container, modules: Array<ModuleType | ExtendedModule>) {
  const activeModules = filterInactiveModules(modules, di);
  return activeModules;
}

// Фаза 3: Регистрация провайдеров
export async function registerProvidersPhase(
  di: Container,
  modules: Array<ModuleType | ExtendedModule>,
  modulesToResolve: Set<ModuleType>,
) {
  for (const mod of modules) {
    const moduleParameters = getModuleParameters(mod);
    modulesToResolve.add(isExtendedModule(mod) ? mod.mainModule : mod);
    walkOfProviders(di, moduleParameters.providers);
  }

  return modules;
}

// Фаза 4: Создание экземпляров модулей
export async function instantiateModulesPhase(di: Container, modulesToResolve: Set<ModuleType>) {
  resolveModules(di, modulesToResolve);
}

// В будущем вы можете добавлять сюда дополнительные фазы.
// Например:
// async function lazyLoadModulesPhase(di: Container, modules: ModuleType[]) {
//   // Здесь можно что-то сделать: подгрузить часть модулей по требованию.
//   return modules;
// }

// async function validateConfigurationPhase(di: Container, modules: ModuleType[]) {
//   // Дополнительная валидация конфигурации
//   return modules;
// }
