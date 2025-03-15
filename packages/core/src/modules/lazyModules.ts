import type { Container } from '../Container.js';
import {
  applyCanActivate,
  instantiateModulesPhase,
  registerProvidersPhase,
  runLoaders,
} from '../initContainer/phases.js';
import type { ExtendedModule, ModuleType } from '../modules/module.h.js';
import { walkOfModules } from '../modules/walkOfModules.js';
import { getModuleParameters } from './getModuleParameters.js';

export interface LazyModuleRef {
  __lazy: true;
  importer: () => Promise<any>;
  exportName: string;
}

/**
 * Хелпер для создания ссылки на ленивый модуль.
 * @param importer Функция, которая возвращает Promise от динамического импорта (пример: () => import('./MyModule'))
 * @param exportName Имя экспорта, содержащего модуль (пример: 'MyModule')
 */
export function defineLazyModule(importer: () => Promise<any>, exportName: string): LazyModuleRef {
  return {
    __lazy: true,
    importer,
    exportName,
  };
}

const loadedLazyModules = new Set<string>(); // чтобы не грузить повторно

export async function loadLazyModule(di: Container, modOrRef: ModuleType | ExtendedModule | LazyModuleRef) {
  let targetModule: ModuleType | ExtendedModule;

  if (isLazyModuleRef(modOrRef)) {
    // Если это LazyModuleRef, делаем динамический импорт
    const moduleNamespace = await modOrRef.importer();
    const exportedModule = moduleNamespace[modOrRef.exportName];
    if (!exportedModule) {
      throw new Error(`Lazy module export "${modOrRef.exportName}" not found in dynamically imported module.`);
    }
    targetModule = exportedModule;
  } else {
    targetModule = modOrRef;
  }

  const moduleParameters = getModuleParameters(targetModule);
  if (loadedLazyModules.has(moduleParameters.id)) {
    return; // Уже загружен
  }

  // Загружаем модуль с includeLazy = true, чтобы учесть, если он тоже lazy
  const lazyModules = walkOfModules([targetModule], true);

  // Запускаем наш pipeline для этого набора модулей
  await runLoaders(di, lazyModules);
  const activeLazyModules = await applyCanActivate(di, lazyModules);

  // Если основной модуль не активирован, выходим
  if (!activeLazyModules.includes(targetModule)) {
    return;
  }

  const modulesToResolve = new Set<ModuleType>();
  await registerProvidersPhase(di, activeLazyModules, modulesToResolve);
  await instantiateModulesPhase(di, modulesToResolve);

  loadedLazyModules.add(moduleParameters.id);
}

function isLazyModuleRef(value: any): value is LazyModuleRef {
  return value && value.__lazy === true;
}
