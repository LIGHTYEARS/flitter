function DP0(T) {
  let [R, a] = T.split("Ctrl-C");
  if (!R || a === void 0) return oR.whiteBright(T);
  return `${oR.whiteBright(R)}${oR.blueBright("Ctrl-C")}${oR.whiteBright(a)}`;
}
function wP0(T) {
  let R = T;
  return R = R.replaceAll("[y/n]", `[${oR.blueBright("y")}/${oR.blueBright("n")}]`), R = R.replaceAll("[y/N]", `[${oR.blueBright("y")}/${oR.blueBright.bold("N")}]`), R = R.replaceAll("[Y/n]", `[${oR.blueBright.bold("Y")}/${oR.blueBright("n")}]`), R = R.replaceAll("(y)es", `${oR.blueBright("y")}es`), R = R.replaceAll("(n)o", `${oR.blueBright("n")}o`), R = R.replaceAll("Ctrl-C", oR.blueBright("Ctrl-C")), R = R.replaceAll("Enter", oR.blueBright("Enter")), R;
}