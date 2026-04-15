function XqR(T) {
  if (T === "") return "''";
  if (T = T.replace(/\n/g, "\\n").replace(/\t/g, "\\t"), !/[\s"'\\$&|<>^`(){}!*?;~]/.test(T) && T) return T;
  return "'" + T.replace(/'/g, "'\\'''") + "'";
}