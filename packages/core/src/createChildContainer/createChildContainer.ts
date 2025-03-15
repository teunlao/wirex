import { ChildContainer } from '../ChildContainer.js';
import type { Container } from '../Container.js';
import type { Provider } from '../IProvider.js';

export function createChildContainer(container: Container, providers?: Provider[]) {
  const childContainer = new ChildContainer(container);

  if (providers) {
    providers.forEach((provider) => {
      childContainer.register(provider);
    });
  }

  return childContainer;
}
