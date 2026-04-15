function bAT(T, R) {
  return `\`\`\`${MR.basename(I8(T))}
${R}
\`\`\``;
}
async function uwT({
  fileSystem: T
}, R, a, e) {
  let t = a.searchPaths.map(I8),
    r = new Map();
  async function h(A) {
    let l = r.get(A);
    if (!l) l = await ULT(T, t, A, e), r.set(A, l);
    return l;
  }
  let i = new xh(),
    c = new xh(),
    s = [];
  for (let A of R) {
    let l = IfR(A) ? zR.file(A, A.includes("\\") ? "windows" : "posix") : await h(A);
    if (s.some(n => MR.equalURIs(n.uri, l))) continue;
    let o;
    try {
      o = await T.stat(l);
    } catch (n) {
      continue;
    }
    if (o.isDirectory) {
      s.push({
        uri: d0(l)
      });
      continue;
    }
    if (gfR(l)) {
      s.push({
        uri: d0(l)
      });
      continue;
    }
    try {
      let n = await wLT(T, l);
      if (n && fN(n.mimeType) && a.shouldIncludeImages !== !1) {
        if (n.size / 1024 / 1024 > 4) {
          J.warn("Mentioned image is too large. Skipping.");
          continue;
        }
        c.set(l, n);
        try {
          let p = await T.readBinaryFile(l);
          if (p.length === 0) {
            J.error("Empty image file detected", {
              uri: l
            });
            continue;
          }
          let _ = p.toString("base64");
          i.set(l, _);
        } catch (p) {
          J.error("Failed to read image as binary", {
            uri: l
          }, p), i.set(l, `[Image file: ${l.toString()} (${n.mimeType}, ${Math.round(n.size / 1024)} KB)]`);
        }
        s.push({
          uri: d0(l)
        });
      } else {
        let p = await gbR(T, l, e);
        if (p === "binary") continue;
        if (s.push({
          uri: d0(l)
        }), p !== void 0) i.set(l, p);
      }
    } catch (n) {
      J.debug("Failed to process file mention", {
        uri: l,
        path: A
      }, n);
    }
  }
  if (s.length === 0) return;
  return ffR(i, s, c);
}