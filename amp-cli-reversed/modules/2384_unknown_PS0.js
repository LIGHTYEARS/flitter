function PS0(T) {
  let R = [];
  if (!Array.isArray(T)) throw TypeError("Expected find and replace tuple or list of tuples");
  let a = !T[0] || Array.isArray(T[0]) ? T : [T],
    e = -1;
  while (++e < a.length) {
    let t = a[e];
    R.push([kS0(t[0]), xS0(t[1])]);
  }
  return R;
}