function T$R(T, R) {
  for (let [a, e] of Object.entries(R)) {
    let t = a.split("."),
      r = e.split("."),
      h = new Set(),
      i = -1;
    for (let c = 0; c < t.length; c++) if (t[c] === "*") {
      i = c;
      break;
    }
    if (i !== -1 && r.length > i) for (let c = i; c < r.length; c++) {
      let s = r[c];
      if (s !== "*" && !s.endsWith("[]") && !s.endsWith("[0]")) h.add(s);
    }
    PK(T, t, r, 0, h);
  }
}