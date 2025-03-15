import { Container } from '../Container.js';
import type { Provider } from '../IProvider.js';

export function createContainer(providers?: Provider[]) {
  return new Container(providers);
}
