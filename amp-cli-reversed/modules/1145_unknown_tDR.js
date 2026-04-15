async function* tDR(T, R) {
  if (!T.body) throw R.abort(), new yi("Attempted to iterate over a response with no body");
  let a = new RWT(),
    e = new yb(),
    t = aWT(T.body);
  for await (let r of rDR(t)) for (let h of e.decode(r)) {
    let i = a.decode(h);
    if (i) yield i;
  }
  for (let r of e.flush()) {
    let h = a.decode(r);
    if (h) yield h;
  }
}