function BuT(T, R, a) {
  return T.value === R && a.slice(T.start.offset, T.end.offset) === R;
}
function QzR(T) {
  let R = [],
    a = [...T],
    e = t => {
      if (t === xs || typeof t === "string") return;
      if (t.type === "invocations") {
        a.push(...t.trees);
        return;
      }
      for (let r of t.values) if (typeof r === "object" && r !== null && r.type === "invocations") a.push(...r.trees);
    };
  while (a.length > 0) {
    let t = a.shift();
    if (!t) break;
    R.push(t), e(t.program.value);
    for (let r of t.arguments) e(r.value);
  }
  return R;
}