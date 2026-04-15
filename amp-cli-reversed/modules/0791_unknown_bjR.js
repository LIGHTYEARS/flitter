function bjR(T) {
  let R = {},
    a = H(T, ["media"]);
  if (a != null) {
    let s = GBT(a);
    if (Array.isArray(s)) s = s.map(A => {
      return A;
    });
    Y(R, ["mediaChunks"], s);
  }
  let e = H(T, ["audio"]);
  if (e != null) Y(R, ["audio"], VBT(e));
  let t = H(T, ["audioStreamEnd"]);
  if (t != null) Y(R, ["audioStreamEnd"], t);
  let r = H(T, ["video"]);
  if (r != null) Y(R, ["video"], KBT(r));
  let h = H(T, ["text"]);
  if (h != null) Y(R, ["text"], h);
  let i = H(T, ["activityStart"]);
  if (i != null) Y(R, ["activityStart"], i);
  let c = H(T, ["activityEnd"]);
  if (c != null) Y(R, ["activityEnd"], c);
  return R;
}