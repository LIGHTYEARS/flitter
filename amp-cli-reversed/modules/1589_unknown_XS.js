function XS(T) {
  let R = hlR(T.trim()).split(`
`),
    a = [],
    e = [],
    t = "*** Begin Patch",
    r = "*** End Patch",
    h = R.findIndex(o => o.trim() === "*** Begin Patch"),
    i = R.findIndex(o => o.trim() === "*** End Patch");
  if (h === -1 && i === -1) throw Error(`Invalid patch format: missing *** Begin Patch and *** End Patch markers.
Expected format:
*** Begin Patch
*** Add File: path/to/file.ts
+file contents
*** End Patch`);
  if (h === -1) throw Error('Invalid patch format: missing *** Begin Patch marker. Patch must start with "*** Begin Patch"');
  if (i === -1) throw Error('Invalid patch format: missing *** End Patch marker. Patch must end with "*** End Patch"');
  if (i < h) throw Error("Invalid patch format: *** End Patch appears before *** Begin Patch. Check marker ordering.");
  let c = R.slice(0, h).filter(o => o.trim() !== "");
  if (c.length > 0) e.push(`Warning: ${c.length} non-empty line(s) before *** Begin Patch were ignored. First ignored: "${c[0].slice(0, 40)}${c[0].length > 40 ? "..." : ""}"`);
  let s = R.findIndex((o, n) => n > h && o.trim() === "*** Begin Patch");
  if (s !== -1 && s < i) e.push(`Warning: duplicate "*** Begin Patch" found at line ${s + 1}. Only the first marker is used.`);
  let A = R.slice(i + 1).filter(o => o.trim() !== "");
  if (A.length > 0) e.push(`Warning: ${A.length} non-empty line(s) after *** End Patch were ignored. First ignored: "${A[0].slice(0, 40)}${A[0].length > 40 ? "..." : ""}"`);
  let l = h + 1;
  while (l < i) {
    let o = ilR(R, l);
    if (!o) {
      l++;
      continue;
    }
    let n = R[l];
    if (n.startsWith("*** Add File:")) {
      let {
        content: p,
        nextIdx: _
      } = clR(R, o.nextIdx);
      a.push({
        type: "add",
        path: o.filePath,
        contents: p
      }), l = _;
    } else if (n.startsWith("*** Delete File:")) a.push({
      type: "delete",
      path: o.filePath
    }), l = o.nextIdx;else if (n.startsWith("*** Update File:")) {
      let {
        chunks: p,
        nextIdx: _
      } = slR(R, o.nextIdx);
      a.push({
        type: "update",
        path: o.filePath,
        movePath: o.movePath,
        chunks: p
      }), l = _;
    } else l++;
  }
  return {
    hunks: a,
    warnings: e.length > 0 ? e : void 0
  };
}