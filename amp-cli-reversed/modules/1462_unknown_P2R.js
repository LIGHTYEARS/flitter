function y2R(T) {
  let R = T.trim();
  if (!R || !A2R.test(R)) return;
  return R;
}
function P2R(T, R, a, e, t) {
  return new AR(r => {
    let h = b2R(e, t, a),
      i = R.registerTool(h),
      c = u2R(e),
      s = R.registerTool(c),
      A = new wi(),
      l = qe["code-tour"].model ? Xt(qe["code-tour"].model) : void 0;
    if (!l) {
      i.dispose(), s.dispose(), r.error(Error("Code tour subagent has no model defined"));
      return;
    }
    let o = [{
        role: "user",
        content: T
      }],
      n = A.run(Fx, {
        systemPrompt: a2R,
        model: l,
        spec: qe["code-tour"]
      }, {
        conversation: o,
        toolService: R,
        env: a
      }).subscribe({
        next: p => r.next(p),
        error: p => r.error(p),
        complete: () => r.complete()
      });
    return () => {
      n.unsubscribe(), i.dispose(), s.dispose();
    };
  });
}