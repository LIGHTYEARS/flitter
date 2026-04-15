function $OR(T) {
  let R = {},
    a = H(T, ["fileSearchStoreName"]);
  if (a != null) Y(R, ["_url", "file_search_store_name"], a);
  let e = H(T, ["config"]);
  if (e != null) p6T(e, R);
  return R;
}