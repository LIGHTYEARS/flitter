class tNT {
  async *stream({
    model: T,
    thread: R,
    systemPrompt: a,
    tools: e,
    configService: t,
    signal: r,
    reasoningEffort: h,
    serviceAuthToken: i,
    logger: c
  }) {
    let s = e,
      A = rNT(R),
      l = xER(T, A, s, a.map(n => n.text).join(`

`), R, {
        configService: t
      }, r, _m(R)?.messageId, h, i, c),
      o;
    for await (let n of l) if (o = vER(o, n), o) yield jER(o);
  }
}