function hv0(T) {
  let R = -1,
    a = [];
  while (++R < T.length) {
    let e = T[R][1];
    if (a.push(T[R]), e.type === "labelImage" || e.type === "labelLink" || e.type === "labelEnd") {
      let t = e.type === "labelImage" ? 4 : 2;
      e.type = "data", R += t;
    }
  }
  if (T.length !== a.length) vh(T, 0, T.length, a);
  return T;
}