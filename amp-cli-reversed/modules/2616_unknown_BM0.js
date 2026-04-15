function BM0(T, R) {
  if (R.length === 0) return T;
  let a = MET(T),
    e = R.map((t, r) => $JT(t, a + r));
  return {
    ...T,
    messages: [...T.messages, ...e],
    nextMessageId: Math.max(T.nextMessageId ?? 0, a + e.length)
  };
}