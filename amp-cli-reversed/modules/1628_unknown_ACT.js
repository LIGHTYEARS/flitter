function ACT(T) {
  if (!T || typeof T !== "object") return [];
  let R = T;
  if (R.type === "leaf") {
    let a = R.data;
    if (typeof a?.id !== "number") return [];
    let e = a.editors?.map(t => bAR(t.value)).filter(t => Boolean(t)) ?? [];
    return [{
      id: a.id,
      editors: e,
      preview: typeof a.preview === "number" ? a.preview : void 0,
      mru: Array.isArray(a.mru) ? a.mru.filter(t => Number.isInteger(t)) : []
    }];
  }
  if (R.type === "branch") return (Array.isArray(R.data ?? []) ? R.data ?? [] : []).flatMap(a => ACT(a));
  return [];
}