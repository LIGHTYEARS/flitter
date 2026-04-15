function muT(T) {
  return Ft(u3(T, "SKILL.md")) || Ft(u3(T, "skill.md"));
}
function uuT(T) {
  let R = [];
  if (!Ft(T)) return R;
  if (muT(T)) return R.push(T), R;
  let a = u3(T, "skills"),
    e = Ft(a) ? [a] : [T];
  for (let t of e) {
    let r = jaT(t, {
      withFileTypes: !0
    });
    for (let h of r) if (h.isDirectory()) {
      let i = u3(t, h.name);
      if (muT(i)) R.push(i);
    }
  }
  return R;
}