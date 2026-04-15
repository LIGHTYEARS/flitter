function s50(T) {
  let R = {
      classes: [],
      relationships: [],
      namespaces: []
    },
    a = new Map(),
    e = null,
    t = null,
    r = 0;
  for (let h = 1; h < T.length; h++) {
    let i = T[h];
    if (t && r > 0) {
      if (i === "}") {
        if (r--, r === 0) t = null;
        continue;
      }
      let p = i.match(/^<<(\w+)>>$/);
      if (p) {
        t.annotation = p[1];
        continue;
      }
      let _ = WgT(i);
      if (_) if (_.isMethod) t.methods.push(_.member);else t.attributes.push(_.member);
      continue;
    }
    let c = i.match(/^namespace\s+(\S+)\s*\{$/);
    if (c) {
      e = {
        name: c[1],
        classIds: []
      };
      continue;
    }
    if (i === "}" && e) {
      R.namespaces.push(e), e = null;
      continue;
    }
    let s = i.match(/^class\s+(\S+?)(?:\s*~(\w+)~)?\s*\{$/);
    if (s) {
      let p = s[1],
        _ = s[2],
        m = by(a, p);
      if (_) m.label = `${p}<${_}>`;
      if (t = m, r = 1, e) e.classIds.push(p);
      continue;
    }
    let A = i.match(/^class\s+(\S+?)(?:\s*~(\w+)~)?\s*$/);
    if (A) {
      let p = A[1],
        _ = A[2],
        m = by(a, p);
      if (_) m.label = `${p}<${_}>`;
      if (e) e.classIds.push(p);
      continue;
    }
    let l = i.match(/^class\s+(\S+?)\s*\{\s*<<(\w+)>>\s*\}$/);
    if (l) {
      let p = by(a, l[1]);
      p.annotation = l[2];
      continue;
    }
    let o = i.match(/^(\S+?)\s*:\s*(.+)$/);
    if (o) {
      let p = o[2];
      if (!p.match(/<\|--|--|\*--|o--|-->|\.\.>|\.\.\|>/)) {
        let _ = by(a, o[1]),
          m = WgT(p);
        if (m) if (m.isMethod) _.methods.push(m.member);else _.attributes.push(m.member);
        continue;
      }
    }
    let n = o50(i);
    if (n) {
      by(a, n.from), by(a, n.to), R.relationships.push(n);
      continue;
    }
  }
  return R.classes = [...a.values()], R;
}