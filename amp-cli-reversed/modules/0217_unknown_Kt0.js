function Kt0(T) {
  let [R, a] = T.split("#"),
    [e, t] = R.split(".");
  if (!e || !t) {
    g0().warn({
      msg: "failed to parse close reason",
      reason: T
    });
    return;
  }
  return {
    group: e,
    code: t,
    rayId: a
  };
}