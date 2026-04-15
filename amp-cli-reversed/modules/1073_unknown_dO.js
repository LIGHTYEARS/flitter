function N4R(T) {
  return hET(U4R).pipe(Y3(void 0), f0T(() => Q9(T).pipe(Gl(H4R))), nET(), JR(R => R instanceof Error ? null : R), vs(() => AR.of(null)));
}
function $3T(T) {
  return T.message.includes(W4R);
}
function dO(T) {
  let R = ["prompt is too long", "exceed context limit", "context limit reached", "token limit exceeded", "context window", "maximum context length"],
    a = r => {
      let h = r?.toLowerCase() ?? "";
      return R.some(i => h.includes(i));
    },
    e = T.error?.type === "invalid_request_error" && a(T.error.message),
    t = a(T.message);
  return e || t;
}