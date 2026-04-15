function az0(T) {
  switch (T) {
    case "handoff":
      return "Handed off from";
    case "fork":
      return "Forked from";
  }
}
function C8R(T) {
  return T.replace(/\r?\n/g, " ");
}
function ez0(T) {
  let R = C8R(T),
    a = B9(R);
  if (a.length <= QgT) return R;
  return a.slice(0, QgT).join("");
}
function tz0(T, R, a = "darwin") {
  if (a === "win32") {
    let e = T.replace(/\\/g, "/").toLowerCase(),
      t = R.replace(/\\/g, "/").toLowerCase();
    return e === t;
  }
  return T === R;
}
function $B(T) {
  let R = cz0(T);
  return O$() === "win32" ? R.toLowerCase() : R;
}
function vB(T, R) {
  return $B(T) === $B(R);
}
function Vo(T, ...R) {
  return $B(T).endsWith($B(jS(...R)));
}
function bhT(T, R) {
  let a = phT();
  if (R) {
    let e = _hT(R, T);
    if (e && !e.startsWith("..")) return `./${e}`;
  }
  if (T.startsWith(a)) return T.replace(a, "~");
  return T;
}
function oz0(T) {
  let R = T.replace(/^\.[/\\]/, "");
  return R.endsWith("/") || R.endsWith("\\") ? R : `${R}${sz0}`;
}
function nz0(T, R) {
  let a = phT();
  if (Vo(T, ".config", "agents", "skills")) return O$() === "win32" ? "%USERPROFILE%\\.config\\agents\\skills\\" : "~/.config/agents/skills/";
  if (Vo(T, ".config", "amp", "skills")) return O$() === "win32" ? "%USERPROFILE%\\.config\\agents\\skills\\" : "~/.config/agents/skills/";
  if (Vo(T, ".agents", "skills")) return vB(T, jS(a, ".agents", "skills")) ? O$() === "win32" ? "%USERPROFILE%\\.agents\\skills\\" : "~/.agents/skills/" : ".agents/skills/";
  if (Vo(T, ".claude", "skills")) return vB(T, jS(a, ".claude", "skills")) ? O$() === "win32" ? "%USERPROFILE%\\.claude\\skills\\" : "~/.claude/skills/" : ".claude/skills/";
  return oz0(bhT(T, R));
}