function HaT(T, R, a, e = !1) {
  let t, r, h, i, c, s;
  if (Sh.isActorError(T) && T.public) t = "statusCode" in T && T.statusCode ? T.statusCode : 400, r = !0, h = T.group, i = T.code, c = p$(T), s = T.metadata, R.info({
    msg: "public error",
    group: h,
    code: i,
    message: c,
    ...r4,
    ...a
  });else if (e) {
    if (Sh.isActorError(T)) t = 500, r = !1, h = T.group, i = T.code, c = p$(T), s = T.metadata, R.info({
      msg: "internal error",
      group: h,
      code: i,
      message: c,
      stack: T == null ? void 0 : T.stack,
      ...r4,
      ...a
    });else t = 500, r = !1, h = "rivetkit", i = XX, c = p$(T), R.info({
      msg: "internal error",
      group: h,
      code: i,
      message: c,
      stack: T == null ? void 0 : T.stack,
      ...r4,
      ...a
    });
  } else t = 500, r = !1, h = "rivetkit", i = XX, c = x1R, s = {}, R.warn({
    msg: "internal error",
    error: p$(T),
    stack: T == null ? void 0 : T.stack,
    ...r4,
    ...a
  });
  return {
    __type: "ActorError",
    statusCode: t,
    public: r,
    group: h,
    code: i,
    message: c,
    metadata: s
  };
}