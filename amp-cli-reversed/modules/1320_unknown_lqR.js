function nqR(T) {
  return T.match(/\/([^/]+?)(?:\.git)?$/)?.[1];
}
function lqR(T) {
  if (T.startsWith("/") || T.startsWith("./") || T.startsWith("../")) return {
    type: "local",
    url: T
  };
  let R = T.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/[^/]+\/(.+?)(?:\/)?$/);
  if (R) {
    let [, t, r, h] = R;
    return {
      type: "github",
      url: `https://github.com/${t}/${r}.git`,
      skillPath: h
    };
  }
  let a = T.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/[^/]+\/(.+)$/);
  if (a) {
    let t = a[1],
      r = a[2],
      h = a[3] ?? "",
      i = h.lastIndexOf("/"),
      c = i > 0 ? h.substring(0, i) : void 0;
    return {
      type: "github",
      url: `https://github.com/${t}/${r}.git`,
      skillPath: c
    };
  }
  if (T.startsWith("https://") || T.startsWith("git@")) return {
    type: "git",
    url: T
  };
  let e = T.split("/");
  if (e.length >= 2) {
    let [t, r, ...h] = e,
      i = h.length > 0 ? h.join("/") : void 0;
    return {
      type: "github",
      url: `https://github.com/${t}/${r}.git`,
      skillPath: i
    };
  }
  throw Error(`Invalid skill source: ${T}. Expected owner/repo, git URL, or local path.`);
}