function E$R(T) {
  let R = {},
    a = H(T, ["citationSources"]);
  if (a != null) {
    let e = a;
    if (Array.isArray(e)) e = e.map(t => {
      return t;
    });
    Y(R, ["citations"], e);
  }
  return R;
}