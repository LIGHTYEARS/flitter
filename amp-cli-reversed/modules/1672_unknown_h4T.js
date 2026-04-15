function OpR(T) {
  return T.replace(/ /g, "\\ ");
}
function h4T(T) {
  let R = T;
  if (R.startsWith("~/")) {
    let a = process.env.HOME || process.env.USERPROFILE || "";
    R = R.replace("~/", `${a}/`);
  } else if (R === "~") R = process.env.HOME || process.env.USERPROFILE || "";
  if (R = R.replace(/%([^%]+)%/g, (a, e) => {
    return process.env[e] || `%${e}%`;
  }), R.includes("%USERPROFILE%") && process.env.USERPROFILE) R = R.replace(/%USERPROFILE%/g, process.env.USERPROFILE);
  return zR.file(R);
}