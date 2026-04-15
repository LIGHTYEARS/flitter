function hXR(T, R, a) {
  let {
    model: e,
    provider: t
  } = rXR(a);
  return J.debug("Task subagent starting:", {
    model: e,
    provider: t,
    description: R.substring(0, 100) + (R.length > 100 ? "..." : "")
  }), Q9(() => nXR(a)).pipe(L9(r => {
    if (t === P9.FIREWORKS) return tXR(T, e, r, a);
    return eXR(T, e, r, a);
  }), JR(iXR));
}