function ywR(T) {
  for (let R = T.length - 1; R >= 0; R -= 1) {
    let a = T[R];
    if (!a || a.role !== "user") continue;
    let e = a.userState?.aggmanContext?.availableProjects;
    if (!e || e.length === 0) continue;
    let t = [],
      r = new Set();
    for (let h of e) {
      let i = h.name.trim(),
        c = h.repositoryURL.trim();
      if (!i || !c) continue;
      let s = `${i}\x00${c}`;
      if (r.has(s)) continue;
      if (r.add(s), t.push({
        name: i,
        repositoryURL: c
      }), t.length >= 50) break;
    }
    if (t.length > 0) return t;
  }
  return [];
}