function Cx0(T) {
  let R = LH("progress" in T ? T.progress : void 0);
  if (!Array.isArray(R)) return [];
  let a = [];
  for (let e of R) {
    if (!ye(e) || typeof e.message !== "string") continue;
    let t = e.message.trim();
    if (t) a.push(t);
  }
  return a;
}