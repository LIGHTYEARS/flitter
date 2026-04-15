class xWT {
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
      c = O8(x3T(R)),
      s = Js(h),
      A = KDR(c, i, a.map(n => n.text).join(`

`), R, T, {
        configService: t
      }, r, _m(R)?.messageId, s ? {
        defaultHeaders: s
      } : void 0, s),
      l = Ys(`moonshotai/${T}`),
      o;
    for await (let n of A) if (o = SO(o, n), o) {
      let p = $k(o, l),
        _ = ZDR(o, l);
      yield _ ? {
        ...p,
        usage: _
      } : p;
    }
  }
}