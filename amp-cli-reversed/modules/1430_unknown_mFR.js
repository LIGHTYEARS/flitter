function bFR(T) {
  if (T.type === "global") return "global";
  return d0(T.path);
}
async function mFR(T, R, a) {
  let e = [];
  try {
    let t = await T.readdir(R);
    for (let r of t) {
      if (r.isDirectory) continue;
      let h = MR.basename(r.uri);
      if (!h.endsWith(".md")) continue;
      try {
        let i = await T.readFile(r.uri);
        if (!i) continue;
        let {
            frontmatter: c,
            body: s
          } = AFR(i),
          A = c?.name ?? h.replace(/\.md$/, "");
        e.push({
          uri: d0(r.uri),
          name: A,
          scope: bFR(a),
          frontmatter: c ?? {
            name: A
          },
          content: s
        });
      } catch (i) {
        J.error("Failed to read checks file", {
          fileUri: r.uri.toString(),
          error: i
        });
      }
    }
  } catch (t) {
    J.error("Failed to list checks directory", {
      checksDir: R.toString(),
      error: t
    });
  }
  return e;
}