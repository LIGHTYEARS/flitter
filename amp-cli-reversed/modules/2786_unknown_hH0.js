function hH0(T, R, a) {
  let e = a.normalizedQuery ?? a.query.trim().toLowerCase(),
    t = a.hasExactNounOrVerbMatch ?? ((h, i) => h.noun?.toLowerCase() === i || h.verb.toLowerCase() === i),
    r = a.hasExactAliasMatch ?? ((h, i) => h.aliases?.some(c => c.toLowerCase() === i) ?? !1);
  if (e !== "") {
    let h = a.getCommandFollows(T.item.id),
      i = a.getCommandFollows(R.item.id);
    if (h.has(R.item.id)) return 1;
    if (i.has(T.item.id)) return -1;
  }
  if (e !== "") {
    let h = t(T.item, e),
      i = t(R.item, e);
    if (h && !i) return -1;
    if (i && !h) return 1;
  }
  if (e !== "") {
    let h = r(T.item, e),
      i = r(R.item, e);
    if (h && !i) return -1;
    if (i && !h) return 1;
  }
  if (R.score !== T.score) return R.score - T.score;
  return a.getPriority(R.item.id) - a.getPriority(T.item.id);
}