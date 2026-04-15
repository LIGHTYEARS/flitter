function sb0(T, R = "  ") {
  let a = OVT(T).map(({
    cmd: e,
    level: t
  }) => {
    let r = R.repeat(t),
      h = e.aliases(),
      i = e.summary() || e.description(),
      c = h.length > 0 ? `[alias: ${h.join(", ")}] ` : "";
    return [r + e.name(), c + i];
  });
  return ltT(a);
}