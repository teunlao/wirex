import { createToken, define } from '@wirex/core';
import { TestClass } from './TestClass.js';
import { lazy } from './lazy.js';

const TEST_TOKEN = createToken<TestClass>('test');
const DEP_TOKEN = createToken<string>('dep');

// Это должно работать - передаем deps
const validProvider = define.class(TEST_TOKEN, TestClass, {
  deps: { dep: DEP_TOKEN },
  scope: 'singleton',
});

// Это должно работать с lazy-загрузкой - передаем deps
const validLazyProvider = define.class(
  TEST_TOKEN,
  lazy(() => import('./TestClass.js').then((m) => m.TestClass)),
  {
    deps: { dep: DEP_TOKEN },
    scope: 'singleton',
  },
);

// Это должно выдать ошибку типа - отсутствуют deps для класса с конструктором
const invalidProvider = define.class(TEST_TOKEN, TestClass, {
  scope: 'singleton',
});

// Это должно выдать ошибку типа - отсутствуют deps для lazy-класса с конструктором
const invalidLazyProvider = define.class(
  TEST_TOKEN,
  lazy(() => import('./TestClass.js').then((m) => m.TestClass)),
  {
    scope: 'singleton',
  },
);
