function Jx0(T, R) {
  let a = T || "",
    e = {},
    t = 0,
    r,
    h;
  while (t < a.length) {
    AfT.lastIndex = t;
    let i = AfT.exec(a),
      c = a.slice(t, i ? i.index : a.length);
    if (c) {
      if (!r) h = c;else if (r === "#") e.id = c;else if (Array.isArray(e.className)) e.className.push(c);else e.className = [c];
      t += c.length;
    }
    if (i) r = i[0], t++;
  }
  return {
    type: "element",
    tagName: h || R || "div",
    properties: e,
    children: []
  };
}