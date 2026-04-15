function ab(T) {
  let R = T.trim(),
    a = R.startsWith('"') && R.endsWith('"') ? R.slice(1, -1) : R;
  if (a === "/dev/null") return a;
  if (a.startsWith("a/") || a.startsWith("b/")) return a.slice(2);
  return a;
}