function Jb0() {
  if (process.env.AMP_HOME) return process.env.AMP_HOME;
  let T = Zb0();
  if (!T) throw Error("Cannot determine home directory. Set AMP_HOME environment variable to ~/.amp and try again.");
  return gs(T, ".amp");
}