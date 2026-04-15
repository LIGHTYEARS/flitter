class kUT {
  async *stream({
    model: T,
    thread: R,
    systemPrompt: a,
    tools: e,
    configService: t,
    signal: r,
    serviceAuthToken: h
  }) {
    let i = e,
      c = x3T(R),
      s = Js(h),
      A = r4R(c, i, a.map(n => n.text).join(`

`), R, T, {
        configService: t
      }, r, _m(R)?.messageId, s ? {
        defaultHeaders: s
      } : void 0, s),
      l = Ys(`xai/${T}`),
      o;
    for await (let n of A) if (o = SO(o, n), o) yield $k(o, l);
  }
}