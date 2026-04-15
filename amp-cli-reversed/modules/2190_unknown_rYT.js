function pfT(T) {
  let R = String(T || "").trim();
  return R ? R.split(/[ \t\n\r\f]+/g) : [];
}
function rYT(T, R, a) {
  let e = a ? ef0(a) : void 0;
  function t(r, h, ...i) {
    let c;
    if (r === null || r === void 0) {
      c = {
        type: "root",
        children: []
      };
      let s = h;
      i.unshift(s);
    } else {
      c = Jx0(r, R);
      let s = c.tagName.toLowerCase(),
        A = e ? e.get(s) : void 0;
      if (c.tagName = A || s, Tf0(h)) i.unshift(h);else for (let [l, o] of Object.entries(h)) Rf0(T, c.properties, l, o);
    }
    for (let s of i) HY(c.children, s);
    if (c.type === "element" && c.tagName === "template") c.content = {
      type: "root",
      children: c.children
    }, c.children = [];
    return c;
  }
  return t;
}