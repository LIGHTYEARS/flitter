function kOR(T) {
  let R = {},
    a = H(T, ["fileSearchStoreName"]);
  if (a != null) Y(R, ["_url", "file_search_store_name"], a);
  let e = H(T, ["fileName"]);
  if (e != null) Y(R, ["fileName"], e);
  let t = H(T, ["config"]);
  if (t != null) yOR(t, R);
  return R;
}