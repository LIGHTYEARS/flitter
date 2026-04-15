function Mn0(T) {
  let R = T.startsWith(mkT) ? T.slice(mkT.length) : T,
    a;
  try {
    a = JSON.parse(R);
  } catch {
    return null;
  }
  let e = En0.safeParse(a);
  if (e.success) return Q1(e.data);
  let t = Cn0.safeParse(a);
  if (t.success) return Q1(t.data);
  return null;
}