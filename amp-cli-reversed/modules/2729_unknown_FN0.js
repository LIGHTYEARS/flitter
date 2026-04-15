function FN0(T) {
  if (T.length === 0) return !1;
  let R = 0,
    a = 0,
    e = 0;
  for (let t of T) switch (t.status) {
    case "active":
      R++;
      break;
    case "loading":
      e++;
      break;
    case "error":
      a++;
      break;
  }
  return !(e === 0 && a === 0);
}