function njR(T, R) {
  let a = {},
    e = H(R, ["model"]);
  if (e != null) Y(a, ["setup", "model"], g8(T, e));
  let t = H(R, ["config"]);
  if (t != null) Y(a, ["config"], sjR(t, a));
  return a;
}
function ljR(T, R) {
  let a = {},
    e = H(R, ["model"]);
  if (e != null) Y(a, ["setup", "model"], g8(T, e));
  let t = H(R, ["config"]);
  if (t != null) Y(a, ["config"], ojR(t, a));
  return a;
}
function AjR(T) {
  let R = {},
    a = H(T, ["musicGenerationConfig"]);
  if (a != null) Y(R, ["musicGenerationConfig"], a);
  return R;
}
function pjR(T) {
  let R = {},
    a = H(T, ["weightedPrompts"]);
  if (a != null) {
    let e = a;
    if (Array.isArray(e)) e = e.map(t => {
      return t;
    });
    Y(R, ["weightedPrompts"], e);
  }
  return R;
}