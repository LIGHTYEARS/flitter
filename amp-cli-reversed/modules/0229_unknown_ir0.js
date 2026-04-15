function hr0(T) {
  return new Response(T.body, T);
}
function ir0(T, R, a) {
  let e = new Headers();
  R.headers.forEach((t, r) => {
    e.set(r, t);
  });
  for (let [t, r] of Object.entries(T.headers)) e.set(t, r);
  if (T.token) e.set(_90, T.token);
  return e;
}