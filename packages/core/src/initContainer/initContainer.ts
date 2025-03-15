import type { Provider } from '../IProvider.js';
import { createContainer } from '../createContainer/createContainer.js';
import type { ExtendedModule, ModuleType } from '../modules/module.h.js';
import { walkOfModules } from '../modules/walkOfModules.js';
import {
  applyCanActivate,
  instantiateModulesPhase,
  registerProvidersPhase,
  runLoaders,
  walkOfProviders,
} from './phases.js';
import { resolveLazyProvidersPhase } from './resolveLazyProviders.js';

export async function initContainer({
  modules = [],
  initialProviders = [],
  providers = [],
}: {
  modules?: (ModuleType | ExtendedModule)[];
  initialProviders?: Provider[];
  providers?: Provider[];
} = {}) {
  const di = createContainer();

  // Регистрируем initialProviders
  walkOfProviders(di, initialProviders);

  // Фаза 0: Сбор всех модулей синхронно
  const allModules = walkOfModules(modules);

  // Мы создаём pipeline фаз, сейчас он определён статически,
  // но вы можете сделать его динамическим, конфигурируемым или дополняемым в будущем.

  // Pipeline:
  // 1. Выполняем лоадеры
  await runLoaders(di, allModules);

  // 2. Фильтруем по canActivate
  const activeModules = await applyCanActivate(di, allModules);

  // В будущем между applyCanActivate и registerProvidersPhase
  // вы сможете вставить дополнительные фазы без ломки кода.

  // Например, здесь можно было бы вызвать lazyLoadModulesPhase(di, activeModules) если нужно.

  // Регистрируем дополнительные провайдеры
  walkOfProviders(di, providers);

  // 3. Регистрируем провайдеры активных модулей
  const modulesToResolve = new Set<ModuleType>();
  await registerProvidersPhase(di, activeModules, modulesToResolve);

  // await resolveLazyProvidersPhase(di);

  await resolveLazyProvidersPhase(di);

  // 4. Создаём экземпляры модулей
  await instantiateModulesPhase(di, modulesToResolve);

  return di;
}
