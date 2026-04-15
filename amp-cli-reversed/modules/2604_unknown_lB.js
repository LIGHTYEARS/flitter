function lB(T) {
  let {
    thread: R,
    viewState: a,
    resolvedTokenUsage: e
  } = T;
  if (!R) return XP();
  let {
      items: t
    } = grT(R),
    r = O0T({
      messages: R.messages
    }),
    h = Array.isArray(r) ? r : [];
  return {
    viewState: a,
    subagentContentByParentID: jM0(t, R),
    items: t,
    todosList: h,
    mainThread: R,
    resolvedTokenUsage: e ?? $h(R)
  };
}