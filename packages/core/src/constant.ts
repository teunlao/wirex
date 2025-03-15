export const Scope = {
  REQUEST: 'request' as const,
  SINGLETON: 'singleton' as const,
  TRANSIENT: 'transient' as const,
};

export const Errors = {
  NOT_FOUND: 'NotFound',
  CIRCULAR_DEP: 'CircularDep',
  REQUIRE_MULTI: 'RequireMulti',
  MIXED_MULTI: 'MixedMulti',
  WRONG_FORMAT: 'WrongFormat',
};
