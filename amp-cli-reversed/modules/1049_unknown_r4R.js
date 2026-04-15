async function* r4R(T, R, a, e, t, r, h, i, c, s) {
  let A = await uUT(r, h, c),
    l = [{
      role: "system",
      content: a
    }, ...T],
    o = {
      model: t,
      messages: l,
      tools: bUT(R),
      stream: !0,
      stream_options: {
        include_usage: !0
      }
    };
  try {
    yield* await A.chat.completions.create(o, {
      signal: h,
      headers: {
        ...yUT(e, i),
        ...(s ?? {})
      }
    });
  } catch (n) {
    if (xr(n)) throw new DOMException("Aborted", "AbortError");
    throw PUT(n);
  }
}