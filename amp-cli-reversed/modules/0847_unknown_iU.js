function iU(T, R) {
  let a = {},
    e = H(T, ["_self"]);
  if (e != null) Y(a, ["image"], c6T(e));
  let t = H(T, ["raiFilteredReason"]);
  if (t != null) Y(a, ["raiFilteredReason"], t);
  let r = H(T, ["_self"]);
  if (r != null) Y(a, ["safetyAttributes"], o6T(r));
  let h = H(T, ["prompt"]);
  if (h != null) Y(a, ["enhancedPrompt"], h);
  return a;
}