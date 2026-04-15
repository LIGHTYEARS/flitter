function cfT(T, R = "activity") {
  let a = new Map();
  for (let t of T) a.set(t.kind, (a.get(t.kind) ?? 0) + 1);
  let e = [];
  for (let [t, r, h] of [["read", "read", void 0], ["search", "search", "searches"], ["web", "web search", "web searches"], ["explore", "exploration", void 0], ["list", "list", void 0]]) {
    let i = a.get(t);
    if (!i) continue;
    e.push(`${i} ${o9(i, r, h)}`);
  }
  if (e.length > 0) return e.join(", ");
  return R;
}