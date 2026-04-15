function $X(T, R) {
  if (!R) R = vWT;
  if (Array.isArray(T)) {
    if (T.length > 1 && !R.includeFileHeaders) throw Error("Cannot omit file headers on a multi-file patch. (The result would be unparseable; how would a tool trying to apply the patch know which changes are to which file?)");
    return T.map(e => $X(e, R)).join(`
`);
  }
  let a = [];
  if (R.includeIndex && T.oldFileName == T.newFileName) a.push("Index: " + T.oldFileName);
  if (R.includeUnderline) a.push("===================================================================");
  if (R.includeFileHeaders) a.push("--- " + T.oldFileName + (typeof T.oldHeader > "u" ? "" : "\t" + T.oldHeader)), a.push("+++ " + T.newFileName + (typeof T.newHeader > "u" ? "" : "\t" + T.newHeader));
  for (let e = 0; e < T.hunks.length; e++) {
    let t = T.hunks[e];
    if (t.oldLines === 0) t.oldStart -= 1;
    if (t.newLines === 0) t.newStart -= 1;
    a.push("@@ -" + t.oldStart + "," + t.oldLines + " +" + t.newStart + "," + t.newLines + " @@");
    for (let r of t.lines) a.push(r);
  }
  return a.join(`
`) + `
`;
}