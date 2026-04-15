function WDR(T, R, a) {
  return m0(HDR(T.configService.config, a?.defaultHeaders), R);
}
function qDR(T, R) {
  return {
    ...Xs(),
    [yc]: "amp.chat",
    ...Vs(T),
    ...(R != null ? {
      [zA]: String(R)
    } : {})
  };
}
function zDR(T) {
  return `toolu_${T.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}
class gX {
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
      c = O8(y3T(R)),
      s = T === "kimi-k2-instruct-0905" ? "moonshotai/kimi-k2-instruct-0905" : T === "gpt-oss-120b" ? "openai/gpt-oss-120b" : T,
      A = Js(h),
      l = await WDR({
        configService: t
      }, r, A ? {
        defaultHeaders: A
      } : void 0),
      o = [{
        role: "system",
        content: a
      }, ...c],
      n = {
        model: s,
        messages: o,
        tools: UDR(i),
        temperature: 0.7,
        stream: !0
      },
      p = await l.chat.completions.create(n, {
        signal: r,
        headers: {
          ...qDR(R, _m(R)?.messageId),
          ...(A ?? {})
        }
      }),
      _;
    for await (let m of p) if (_ = SO(_, m), _) yield FDR(_);
  }
}