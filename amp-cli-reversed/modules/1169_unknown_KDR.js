async function* KDR(T, R, a, e, t, r, h, i, c, s) {
  let A = await XDR(r, h, c),
    l = [{
      role: "system",
      content: a
    }, ...T],
    o = {
      model: t,
      messages: l,
      tools: pUT(R),
      stream: !0,
      stream_options: {
        include_usage: !0
      }
    };
  try {
    yield* await A.chat.completions.create(o, {
      signal: h,
      headers: {
        ...YDR(e, i),
        ...(s ?? {})
      }
    });
  } catch (n) {
    if (xr(n)) throw new DOMException("Aborted", "AbortError");
    throw QDR(n);
  }
}