function vjR(T, R, a) {
  let e = {},
    t = H(R, ["model"]);
  if (t != null) Y(e, ["_url", "model"], g8(T, t));
  let r = H(R, ["contents"]);
  if (r != null) {
    let h = ui(r);
    if (Array.isArray(h)) h = h.map(i => {
      return i;
    });
    Y(e, ["contents"], h);
  }
  return e;
}