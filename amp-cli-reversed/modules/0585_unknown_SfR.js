function Jy(T) {
  return $fR(T?.["experimental.agentMode"]);
}
function $fR(T) {
  return T ?? "smart";
}
function pn(T, R) {
  let a = R.agentMode ?? FET(R) ?? Jy(T),
    e = rAR(T, a);
  return {
    model: e ? e : nk(a),
    agentMode: a
  };
}
function vfR(T) {
  return T + ++jfR;
}
function SfR(T) {
  if (!T._regex) try {
    T._regex = new RegExp(T.pattern, T.caseInsensitive ? "gi" : "g");
  } catch (R) {
    J.warn("Error compiling regex", {
      pattern: T.id,
      error: R
    }), T._regex = /$^/;
  }
  return T._regex;
}