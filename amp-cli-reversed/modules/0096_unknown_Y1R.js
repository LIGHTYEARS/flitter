function Y1R(T) {
  let R = T.getUTCFullYear(),
    a = String(T.getUTCMonth() + 1).padStart(2, "0"),
    e = String(T.getUTCDate()).padStart(2, "0"),
    t = String(T.getUTCHours()).padStart(2, "0"),
    r = String(T.getUTCMinutes()).padStart(2, "0"),
    h = String(T.getUTCSeconds()).padStart(2, "0"),
    i = String(T.getUTCMilliseconds()).padStart(3, "0");
  return `${R}-${a}-${e}T${t}:${r}:${h}.${i}Z`;
}