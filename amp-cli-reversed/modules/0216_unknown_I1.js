function Ft0(T, R) {
  if (!feT(T.actorQuery)) return;
  T.resolvedActorId = R, T.pendingResolve = void 0;
}
function f1(T, R) {
  return T === "actor" && (R === "not_found" || R.startsWith("destroyed_"));
}
function Gt0(T, R) {
  let {
    group: a,
    code: e
  } = HaT(R, g0(), {}, !0);
  if (!f1(a, e)) return !1;
  return bGT(T), !0;
}
function bGT(T) {
  if (!feT(T.actorQuery)) return;
  T.resolvedActorId = void 0, T.pendingResolve = void 0;
}
async function My(T, R, a) {
  let e = !1;
  while (!0) try {
    return await R();
  } catch (t) {
    if (e || !Gt0(T, t)) throw t;
    a == null || a(), e = !0;
  }
}
async function I1(T, R, a, e, t) {
  let r = x1(e);
  try {
    let h = await t.getForId({
      name: r,
      actorId: a
    });
    if (h == null ? void 0 : h.error) return g0().info({
      msg: "found actor scheduling error",
      actorId: a,
      error: h.error
    }), new qt0(T, R, a, h.error);
  } catch (h) {
    g0().warn({
      msg: "failed to fetch actor details for scheduling error check",
      actorId: a,
      error: _r(h)
    });
  }
  return null;
}