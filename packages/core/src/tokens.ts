import type { Container } from './Container.js';
import { createToken } from './createToken/createToken.js';

export const DI_TOKEN = /* #__PURE__*/ createToken<Container>('di');
