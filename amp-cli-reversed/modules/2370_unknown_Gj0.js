function Fj0(T) {
  if (T.label || !T.identifier) return T.label || "";
  return RQT(T.identifier);
}
function Gj0(T) {
  if (!T._compiled) {
    let R = (T.atBreak ? "[\\r\\n][\\t ]*" : "") + (T.before ? "(?:" + T.before + ")" : "");
    T._compiled = new RegExp((R ? "(" + R + ")" : "") + (/[|\\{}()[\]^$+*?.-]/.test(T.character) ? "\\" : "") + T.character + (T.after ? "(?:" + T.after + ")" : ""), "g");
  }
  return T._compiled;
}