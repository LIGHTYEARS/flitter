function Am0(T) {
  if (!T) return null;
  let R = typeof T === "number" ? T : new Date(T).getTime();
  if (isNaN(R)) return null;
  let a = Date.now() - R;
  if (a > lm0) return {
    ageMs: a
  };
  return null;
}