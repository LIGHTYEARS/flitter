function uz0(T) {
  let R = zlR(T),
    a = Array.from(R.entries()).map(([t, r]) => ({
      path: t,
      diffStats: r
    })),
    e = $h(T)?.totalInputTokens ?? 0;
  return {
    filesAffected: a,
    totalTokens: e
  };
}