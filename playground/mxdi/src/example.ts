import { createToken, define } from '@wirex/core';
import { ClassExample } from './ClassExample.js';

// Токены для тестирования
const STRING_TOKEN = createToken<string>('string');
const EXAMPLE_TOKEN = createToken<ClassExample>('example');

// Класс без параметров в конструкторе
class NoParamsClass {
  value = 1;
}

// Класс с одним параметром
class OneParamClass {
  constructor(private readonly param: string) {}
}

// Класс с несколькими параметрами
class MultiParamsClass {
  constructor(
    private readonly param1: string,
    private readonly param2: number,
    private readonly param3: boolean,
  ) {}
}

const TOKEN_NO_PARAMS = createToken<NoParamsClass>('no-params');
const TOKEN_ONE_PARAM = createToken<OneParamClass>('one-param');
const TOKEN_MULTI_PARAMS = createToken<MultiParamsClass>('multi-params');
const NUMBER_TOKEN = createToken<number>('number');
const BOOLEAN_TOKEN = createToken<boolean>('boolean');

// 1. Класс без параметров - deps необязательные
const goodNoParamsProvider = define.provider({
  target: TOKEN_NO_PARAMS,
  useClass: NoParamsClass,
  // deps опционален для класса без параметров
});

// 2. Класс с одним параметром - deps обязательны
const goodOneParamProvider = define({
  target: TOKEN_ONE_PARAM,
  useClass: OneParamClass,
  deps: [STRING_TOKEN] as const, // deps обязателен для класса с параметром
});

// 3. Класс с несколькими параметрами - deps обязательны и должны соответствовать
const goodMultiParamsProvider = define({
  target: TOKEN_MULTI_PARAMS,
  useClass: MultiParamsClass,
  deps: [STRING_TOKEN, NUMBER_TOKEN, BOOLEAN_TOKEN] as const, // правильный порядок и типы
});

// 4. Попытка создать provider с классом с параметрами, но без deps
// Должна вызвать ошибку компиляции
const badNoDepProvider = define({
  target: TOKEN_ONE_PARAM,
  useClass: OneParamClass,
  // deps отсутствует - ошибка типизации
});

// 5. Неправильные deps для класса с параметрами
// Должна вызвать ошибку компиляции из-за ошибки типов
const badTypeProvider = define({
  target: TOKEN_MULTI_PARAMS,
  useClass: MultiParamsClass,
  deps: [NUMBER_TOKEN, STRING_TOKEN, BOOLEAN_TOKEN], // неправильный порядок
});

// 6. Реальный класс из примера - ClassExample имеет 2 строковых параметра
const exampleProvider = define({
  target: EXAMPLE_TOKEN,
  useClass: ClassExample,
  deps: [STRING_TOKEN, STRING_TOKEN], // ClassExample принимает 2 строки
});

// Экспортируем providers для использования
export const providers = [goodNoParamsProvider, goodOneParamProvider, goodMultiParamsProvider, exampleProvider];
