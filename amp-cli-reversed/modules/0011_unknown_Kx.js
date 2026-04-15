function Kx(T) {
  let R = T.trim();
  if (R.includes("://")) {
    let e = new URL(R);
    if (e.hostname !== "github.com") throw Error("Only github.com repositories are supported");
    R = e.pathname;
  }
  R = R.replace(/\.git$/, "").replace(/^\/+|\/+$/g, "");
  let a = R.split("/");
  if (a.length < 2 || !a[0] || !a[1]) throw Error(`Invalid repository: expected "owner/repo" but got "${R}"`);
  return `${a[0]}/${a[1]}`;
}