function pW0(T) {
  let R = new Set(),
    a = [];
  for (let e of T) for (let t of e.guidanceFiles ?? []) {
    let r = `${t.uri}|${t.lineCount}`;
    if (R.has(r)) continue;
    R.add(r), a.push(t);
  }
  return a;
}