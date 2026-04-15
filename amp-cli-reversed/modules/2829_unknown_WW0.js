function WW0(T) {
  if (T.message.role !== "assistant") return [];
  let R = [];
  for (let a of T.message.content) {
    if (a.type !== "thinking") continue;
    if (!Xm(a)) continue;
    let e = tf(a.thinking),
      t = IrT(e).header,
      r = t ? t : "Thinking";
    R.push({
      kind: "thinking",
      title: r,
      thinking: a
    });
  }
  return R;
}