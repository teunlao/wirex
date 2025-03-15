export class TestClass {
  constructor({
    dep,
  }: {
    dep: string;
  }) {
    console.log('TestClass initialized with dep:', dep);
  }
}
