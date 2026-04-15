function K50(T, R) {
  if (!(T === ck || T === Dt || T === tt || T === ja || T === uc)) return;
  if (R === "in-progress" || R === "queued") return "in-progress";
  if (T === ck && R === "blocked-on-user") return "in-progress";
  return;
}