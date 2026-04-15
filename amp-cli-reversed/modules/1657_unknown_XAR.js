function XAR() {
  let T = process.env.ZED_CHANNEL?.trim().toLowerCase() ?? "";
  if (N0T(T)) return T;
  if (!YAR()) return null;
  let R = process.env.TERM_PROGRAM_VERSION?.trim().toLowerCase();
  if (!R) return null;
  for (let a of z0T) if (a !== "stable" && R.includes(a)) return a;
  return "stable";
}