function er0(T, R) {
  let a = _1(R, {
    endpoint: T.endpoint,
    path: ["endpoint"],
    namespace: T.namespace,
    token: T.token
  });
  return {
    ...T,
    endpoint: a == null ? void 0 : a.endpoint,
    namespace: (a == null ? void 0 : a.namespace) ?? T.namespace ?? "default",
    token: (a == null ? void 0 : a.token) ?? T.token
  };
}