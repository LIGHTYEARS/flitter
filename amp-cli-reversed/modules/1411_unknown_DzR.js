async function DzR(T) {
  let R = qU(T);
  if (!R) return [];
  try {
    let {
      stdout: a
    } = await xzT(PzT("git", ["status", "--porcelain=v1", "-z", "--untracked-files=normal"], {
      cwd: R,
      encoding: "utf8",
      maxBuffer: 16777216
    }), kzT);
    return MzR(a, R);
  } catch {
    return [];
  }
}