function mnR(T, R) {
  if (T.scheme !== R.scheme || T.authority !== R.authority || T.query !== R.query || T.fragment !== R.fragment) return null;
  let a = T.platform === "windows" ? "\\" : "/";
  return nnR(T.path, R.path, a, a);
}