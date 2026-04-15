function Fl0(T) {
  let R = Promise.resolve();
  return a => {
    let e = R.then(() => T(a));
    return R = e.catch(() => {}), e;
  };
}
function cy(T, R) {
  let a;
  if (T && typeof T === "object" && "message" in T && typeof T.message === "string") {
    if (a = Error(T.message), "stack" in T && typeof T.stack === "string") a.stack = T.stack;
  } else if (T instanceof Error) a = T;
  if (a && (v3T(a) || dO(a) || fU(a) || IU(a) || $3T(a))) {
    let e = OaT(a, {
      freeTierEnabled: !1
    });
    return e.description ? `${e.title} ${e.description}` : e.title;
  }
  if (a) return a.message;
  return String(T);
}