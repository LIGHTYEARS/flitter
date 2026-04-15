function PXR(T) {
  let R = i3(T, "code");
  if (!R) return null;
  let a = {},
    e = Lk(T, "node");
  for (let t of e) {
    let r = i3(t, "id"),
      h = i3(t, "title"),
      i = i3(t, "description");
    if (!r || !h || !i) continue;
    let c = {
        title: h,
        description: i
      },
      s = i3(t, "links");
    if (s) {
      let A = Lk(s, "link"),
        l = [];
      for (let o of A) {
        let n = i3(o, "label"),
          p = i3(o, "url");
        if (n && p) l.push({
          label: n,
          url: p
        });
      }
      if (l.length > 0) c.links = l;
    }
    a[r] = c;
  }
  if (Object.keys(a).length === 0) return null;
  return {
    code: R.trim(),
    nodes: a
  };
}