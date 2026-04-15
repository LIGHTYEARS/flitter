class fWT {
  async *stream({
    model: T,
    thread: R,
    systemPrompt: a,
    tools: e,
    configService: t,
    signal: r
  }) {
    r?.throwIfAborted();
    let h = e,
      i = y3T(R),
      c = T === "sonoma-sky-alpha" ? "openrouter/sonoma-sky-alpha" : T,
      s = await m0(t.config, r),
      A = a7R(i, h, a.map(n => n.text).join(`

`), c, s, r, R.id, _m(R)?.messageId),
      l = Ys(`openrouter/${T}`),
      o;
    for await (let n of A) if (o = SO(o, n), o) yield $k(o, l);
  }
}