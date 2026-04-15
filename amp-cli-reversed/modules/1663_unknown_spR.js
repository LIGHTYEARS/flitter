function spR(T, R) {
  let a = T.filter(e => e.workspaceFolders.map(Oj).includes(R));
  if (a.length === 1) return a;
  if (a.length === 0) {
    let e = T.filter(t => wCT(t, R));
    if (e.length === 1) return e;
  }
  return;
}