import { Module, createToken, initContainer, lazy, provide } from '@wirex/core';
import { ClassExample } from './ClassExample.js';

const EXAMPLE_TOKEN = createToken<ClassExample>('example');
const LazyClassExample = lazy(() => import('./ClassExample.js').then((m) => m.ClassExample));
const STRING_TOKEN = createToken<string>('string');
const NUMBER_TOKEN = createToken<number>('number');

@Module({
  imports: [],
  providers: [
    provide.class(EXAMPLE_TOKEN, ClassExample, {
      deps: [STRING_TOKEN] as const,
    }),

    provide.factory(
      'TOKEN',
      (example) => {
        return 'TOKEN';
      },
      { deps: [EXAMPLE_TOKEN] as const },
    ),
  ],
})
class TestModule {}

const container = await initContainer({
  modules: [TestModule],
});

const example = container.get(EXAMPLE_TOKEN);

console.log(example);
