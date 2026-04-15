function $x0(T) {
  let R = typeof T.path === "string" ? T.path.trim() : void 0,
    a = jx0(T.read_range);
  if (!R) return a ? `Read ${a}` : void 0;
  let e = qA(R);
  return a ? `Read ${e} ${a}` : `Read ${e}`;
}