async function MpR(T, R, a) {
  try {
    let e = await LpR(T, R),
      t = ["~/.config/AGENT.md", ...a];
    for (let r of t) if (E2(e, r) || E2(T, r)) return null;
    for (let {
      key: r,
      pattern: h
    } of a9T) if (tcT(e, h.patterns) || tcT(T, h.patterns)) return {
      key: r,
      pattern: h
    };
    return null;
  } catch {
    return null;
  }
}