async function mL() {
  let T = await B0T();
  if (T.length === 0) return null;
  let R = XAR();
  if (R) {
    let a = T.find(e => U0T(e) === R);
    if (a) return a;
  }
  return (await Promise.all(T.map(async a => ({
    path: a,
    mtime: (await lN.promises.stat(a)).mtimeMs
  })))).sort((a, e) => e.mtime - a.mtime)[0]?.path ?? null;
}