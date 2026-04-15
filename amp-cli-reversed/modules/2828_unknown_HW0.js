function HW0(T, R) {
  let a = T.message;
  if (a.role === "assistant" || a.role === "user") {
    let r = a.content.filter(i => i.type === "text" && !i.hidden).map(i => i.text).join(`

`),
      h = a.content.some(i => i.type === "image");
    if (!r.trim() && !h) return;
    return {
      type: "message",
      id: T.id,
      sourceIndex: R,
      role: a.role,
      text: r,
      message: a
    };
  }
  if (a.role !== "info" || !ok(a)) return;
  let e = ZS(a);
  if (!e) return;
  let t = `${e.hidden ? "$$" : "$"} ${e.args.cmd}`;
  return {
    type: "message",
    id: T.id,
    sourceIndex: R,
    role: a.role,
    text: t,
    message: a
  };
}