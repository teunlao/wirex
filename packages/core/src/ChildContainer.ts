import { Container, NOT_YET } from './Container.js';
import type { RecordProvide } from './IContainer.js';
import { Scope } from './constant.js';
import { createToken } from './createToken/createToken.js';
import { DI_TOKEN } from './tokens.js';

export const IS_DI_CHILD_CONTAINER_TOKEN = createToken<boolean>('isDiChildContainer');

export class ChildContainer extends Container {
  private readonly root: Container;

  constructor(root: Container, fallback?: Container) {
    super(undefined, fallback);
    this.root = root;

    this.register({ provide: DI_TOKEN, useValue: this, scope: Scope.REQUEST });
    this.register({ provide: IS_DI_CHILD_CONTAINER_TOKEN, useValue: true });
  }

  getRecord<T>(token: symbol) {
    const record = super.getRecord<T>(token);

    if (record) {
      return record;
    }

    return this.root.getRecord<T>(token);
  }

  getValue<T>(record: RecordProvide<any>) {
    if (this.recordValues.has(record)) {
      return this.recordValues.get(record);
    }

    if (record.scope === Scope.SINGLETON || !record.factory) {
      return this.root.getValue<T>(record);
    }

    return NOT_YET;
  }

  protected hydrateDeps<T>(record: RecordProvide<T>) {
    if (record.scope === Scope.REQUEST) {
      return super.hydrateDeps(record);
    }

    return super.hydrateDeps.call(this.root, record);
  }

  protected hydrate<T>(record: RecordProvide<T>, token: symbol, optional: boolean): T | null {
    if (record.scope === Scope.REQUEST) {
      return super.hydrate(record, token, optional);
    }

    return super.hydrate.call<Container, [RecordProvide<T>, symbol, boolean], T | null>(
      this.root,
      record,
      token,
      optional,
    );
  }
}
