function eE0(T, R) {
  let a = `${R}:${T}`,
    e = 5381;
  for (let t = 0; t < a.length; t++) {
    let r = a.charCodeAt(t);
    e = e * 33 ^ r;
  }
  return `md-${(e >>> 0).toString(36)}`;
}
function lrT(T) {
  let R = $R.of(T),
    a = R.colors;
  return {
    text: new cT({
      color: a.foreground
    }),
    inlineCode: new cT({
      color: R.app.inlineCode,
      bold: !0
    }),
    codeBlock: new cT({
      color: R.app.codeBlock
    }),
    tableBorder: R.app.tableBorder,
    link: new cT({
      color: R.app.link,
      underline: !0
    }),
    syntaxHighlight: R.app.syntaxHighlight
  };
}