function dDR(T, R) {
  return {
    ...Xs(),
    [yc]: "amp.chat",
    ...Vs(T),
    ...(R != null ? {
      [zA]: String(R)
    } : {})
  };
}
async function yWT(T, R, a, e, t, r, h, i, c, s, A) {
  let l = await CDR(h, i, s),
    o = [{
      role: "system",
      content: a
    }, ...T],
    n = {
      model: t,
      messages: o,
      tools: ODR(R),
      temperature: r,
      stream: !1
    };
  return {
    message: await l.chat.completions.create(n, {
      signal: i,
      headers: {
        ...dDR(e, c),
        ...(A ?? {})
      }
    })
  };
}