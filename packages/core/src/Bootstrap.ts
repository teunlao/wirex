export abstract class Bootstrap {
  /**
   * Метод загрузки, который должен быть реализован в дочерних классах
   */
  abstract load(): Promise<void> | void;

  /**
   * Метод для освобождения ресурсов, который должен быть реализован в дочерних классах
   */
  abstract dispose(): Promise<void> | void;

  /**
   * Статический метод для проверки, является ли класс наследником Bootstrap.
   * Это полезно для ленивых загрузок и саморегистрации.
   */
  static readonly isBootstrap = true;
}
