function sQT(T, R) {
  let a = !1;
  return kj0(T, function (e) {
    if ("value" in e && /\r?\n|\r/.test(e.value) || e.type === "break") return a = !0, YY;
  }), Boolean((!T.depth || T.depth < 3) && RrT(T) && (R.options.setext || a));
}