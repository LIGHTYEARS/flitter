async function* a7R(T, R, a, e, t, r, h, i) {
  r?.throwIfAborted();
  let c = await R7R(t),
    s = [{
      role: "system",
      content: a
    }, ...O8(T)],
    A = {
      model: T7R(e),
      messages: s,
      tools: pUT(R),
      stream: !0
    };
  yield* await c.chat.completions.create(A, {
    signal: r
  });
}