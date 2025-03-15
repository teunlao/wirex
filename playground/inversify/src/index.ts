import { Container, injectable } from 'inversify';

@injectable()
class Test {
  constructor() {
    console.log('Test constructor');
  }
}

const container = new Container({
  autobind: true,
  defaultScope: 'Singleton',
});

container.bind('test').toConstantValue('test');
container.bind('test2').toConstantValue('test2');

const test = await container.getAsync(Test);

console.log(test);
