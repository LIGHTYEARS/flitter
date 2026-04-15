function JgT(T, R) {
  if (T.startsWith("builtin://")) return T.replace("builtin://", "(builtin) ");
  if (!T.startsWith("file://")) return T;
  try {
    return bhT(gW(T), R);
  } catch {
    return T;
  }
}