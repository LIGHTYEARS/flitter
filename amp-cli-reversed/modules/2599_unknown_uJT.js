function bM0(T) {
  let R = T.replace(/\r/g, "");
  if (!R.includes("\x1B")) return R;
  return Fk0(R).toPlainText();
}
function uJT(T) {
  let R;
  for (let [a, e] of T.entries()) {
    let t = bM0(e.content);
    if (t === e.content) continue;
    if (!R) R = new Map(T);
    R.set(a, {
      ...e,
      content: t
    });
  }
  return R ?? T;
}