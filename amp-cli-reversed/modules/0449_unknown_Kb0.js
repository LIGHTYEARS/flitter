function NVT() {
  let T = BVT(),
    R = mS(T, "bin");
  return mS(R, !1 ? "amp.exe" : "amp");
}
async function Fb0() {
  let T = `${nY}/cli-version.txt`,
    R = await lY(T);
  if (!R.ok) throw Error(`Failed to fetch latest version: ${R.status}`);
  return (await R.text()).trim();
}
function oxT(T) {
  return T;
}
function UVT(T) {
  let R = Bb0(T);
  return `${R ? T.slice(0, T.length - R.length) : T}.old${R}`;
}
function Gb0(T) {
  return oxT(process.execPath) === oxT(T);
}
function Kb0(T, R) {
  let a = UVT(T);
  if (ptT(a)) _tT(a);
  jv(T, a);
  try {
    jv(R, T);
  } catch (e) {
    try {
      jv(a, T);
    } catch (t) {
      throw Error(`Failed to install Windows binary update and restore original binary: ${t instanceof Error ? t.message : String(t)}`);
    }
    throw e;
  }
  J.info("Binary updated successfully", {
    binaryPath: T,
    oldBinaryPath: a
  });
}