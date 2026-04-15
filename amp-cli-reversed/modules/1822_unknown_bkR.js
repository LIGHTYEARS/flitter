function _kR(T) {
  let R = T.replace(/```[\s\S]*?```/g, "");
  return R = R.replace(/`[^`]*`/g, ""), R = R.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, ""), R;
}
async function bkR(T, R, a, e, t) {
  let r, h;
  if (a.startsWith("~/")) {
    if (e.homeDir === null) return [];
    let i = a.slice(2),
      {
        basePart: c,
        patternPart: s
      } = qq(i);
    r = c ? MR.joinPath(e.homeDir, c) : I8(e.homeDir), h = s;
  } else if (a.startsWith("/")) {
    let i = a.slice(1),
      {
        basePart: c,
        patternPart: s
      } = qq(i);
    r = c ? MR.joinPath(zR.file("/"), c) : zR.file("/"), h = s;
  } else {
    let i = MR.dirname(R),
      {
        basePart: c,
        patternPart: s
      } = qq(a);
    r = c ? MR.joinPath(i, c) : i, h = s;
  }
  if (JDT(h)) try {
    let i = await T.findFiles({
      base: r,
      pattern: h
    }, {
      signal: t,
      maxResults: 1000
    });
    if (i.length >= 1000) J.warn("Truncating very large glob expansion result", `Limit (1000) exceeded for '${a}' in ${R.fsPath}.`);
    return i;
  } catch (i) {
    return [];
  }
  if (!h) return [];
  return [MR.joinPath(r, h)];
}