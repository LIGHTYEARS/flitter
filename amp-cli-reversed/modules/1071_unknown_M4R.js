function M4R(T, R = {}) {
  let {
    approximate: a = !0
  } = R;
  if (!a && T < 1000) return `${Math.max(0, Math.round(T))} ms`;
  let e = Math.max(0, Math.round(T / 1000)),
    t = Math.round(T / 1000 / 60);
  if (!a && T < 180000 || t === 0) return `${e} ${o9(e, "second")}`;
  let r = Math.floor(t / 1440),
    h = t % 1440,
    i = Math.floor(h / 60),
    c = h % 60,
    s = [];
  if (r > 0) s.push(`${r} ${r === 1 ? "day" : "days"}`);
  if (i > 0) s.push(`${i} ${i === 1 ? "hour" : "hours"}`);
  if (c > 0) s.push(`${c} ${c === 1 ? "minute" : "minutes"}`);
  if (s.length === 0) return "less than a minute";
  if (s.length === 1) return s[0];
  let A = s.pop();
  if (s.length > 1) return `${s.join(", ")}, and ${A}`;
  return `${s.join(", ")} and ${A}`;
}