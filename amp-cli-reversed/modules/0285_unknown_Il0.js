function Il0(T) {
  if (!(T instanceof Error)) return !1;
  let R = (T.message ?? "").toLowerCase() + (T.stack ?? "").toLowerCase();
  return ["thread", "threadservice", "threadsync", "threadworker", "threadhistory", "threadsummary", "thread-"].some(a => R.includes(a));
}