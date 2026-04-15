function ad0(T) {
  return typeof T === "string";
}
function ed0(T) {
  if (!T.isFile()) throw Error("Path provided was not a file!");
}
async function eB(T = hd0) {
  let R = [T.getEnv("AMP_EDITOR"), T.getEnv("EDITOR"), T.getEnv("VISUAL"), "vi", "nano", "edit"].filter(a => typeof a === "string");
  for (let a of R) if (await id0(T, a)) return a;
  return null;
}