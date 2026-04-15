function fx0(T) {
  if (typeof T.patchText === "string") return {
    patchText: T.patchText
  };
  if (typeof T.patch === "string") return {
    patchText: T.patch
  };
  return;
}
function Ix0(T) {
  try {
    let R = [],
      a = new Set();
    for (let e of XS(T.patchText).hunks) {
      let t = e.type === "update" && e.movePath ? e.movePath : e.path;
      if (a.has(t)) continue;
      a.add(t), R.push(t);
    }
    return R;
  } catch {
    return [];
  }
}