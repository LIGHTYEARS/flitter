function ZzR(T, R, a) {
  if (!T || a.length === 0) return T;
  let e;
  try {
    e = HO(T);
  } catch {
    return T;
  }
  let t = [];
  for (let i of QzR(e)) {
    if (!BuT(i.program, "git", T)) continue;
    let c = i.arguments.find(s => BuT(s, "commit", T));
    if (!c) continue;
    if (R) t.push({
      index: i.program.end.offset,
      text: ` ${R}`
    });
    t.push({
      index: c.end.offset,
      text: ` ${a.join(" ")}`
    });
  }
  if (t.length === 0) return T;
  let r = t.sort((i, c) => c.index - i.index),
    h = T;
  for (let i of r) h = h.slice(0, i.index) + i.text + h.slice(i.index);
  return h;
}