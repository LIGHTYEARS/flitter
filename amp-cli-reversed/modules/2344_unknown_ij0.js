function XY(T, R) {
  return Boolean(R.options.fences === !1 && T.value && !T.lang && /[^ \r\n]/.test(T.value) && !/^[\t ]*(?:[\r\n]|$)|(?:^|[\r\n])[\t ]*$/.test(T.value));
}
function hj0(T) {
  let R = T.options.fence || "`";
  if (R !== "`" && R !== "~") throw Error("Cannot serialize code with `" + R + "` for `options.fence`, expected `` ` `` or `~`");
  return R;
}
function ij0(T, R, a, e) {
  let t = hj0(a),
    r = T.value || "",
    h = t === "`" ? "GraveAccent" : "Tilde";
  if (XY(T, a)) {
    let l = a.enter("codeIndented"),
      o = a.indentLines(r, cj0);
    return l(), o;
  }
  let i = a.createTracker(e),
    c = t.repeat(Math.max(rj0(r, t) + 1, 3)),
    s = a.enter("codeFenced"),
    A = i.move(c);
  if (T.lang) {
    let l = a.enter(`codeFencedLang${h}`);
    A += i.move(a.safe(T.lang, {
      before: A,
      after: " ",
      encode: ["`"],
      ...i.current()
    })), l();
  }
  if (T.lang && T.meta) {
    let l = a.enter(`codeFencedMeta${h}`);
    A += i.move(" "), A += i.move(a.safe(T.meta, {
      before: A,
      after: `
`,
      encode: ["`"],
      ...i.current()
    })), l();
  }
  if (A += i.move(`
`), r) A += i.move(r + `
`);
  return A += i.move(c), s(), A;
}