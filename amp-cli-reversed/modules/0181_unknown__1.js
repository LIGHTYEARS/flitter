function _1(T, R) {
  let {
      endpoint: a,
      path: e = ["endpoint"],
      namespace: t,
      token: r
    } = R,
    h;
  try {
    h = new URL(a);
  } catch {
    T.addIssue({
      code: "custom",
      message: `invalid URL: ${a}`,
      path: e
    });
    return;
  }
  if (h.search) {
    T.addIssue({
      code: "custom",
      message: "endpoint cannot contain a query string",
      path: e
    });
    return;
  }
  if (h.hash) {
    T.addIssue({
      code: "custom",
      message: "endpoint cannot contain a fragment",
      path: e
    });
    return;
  }
  let i = h.username ? decodeURIComponent(h.username) : void 0,
    c = h.password ? decodeURIComponent(h.password) : void 0;
  if (c && !i) {
    T.addIssue({
      code: "custom",
      message: "endpoint cannot have a token without a namespace",
      path: e
    });
    return;
  }
  if (i && t) T.addIssue({
    code: "custom",
    message: "cannot specify namespace both in endpoint URL and as a separate config option",
    path: ["namespace"]
  });
  if (c && r) T.addIssue({
    code: "custom",
    message: "cannot specify token both in endpoint URL and as a separate config option",
    path: ["token"]
  });
  return h.username = "", h.password = "", {
    endpoint: h.toString(),
    namespace: i,
    token: c
  };
}