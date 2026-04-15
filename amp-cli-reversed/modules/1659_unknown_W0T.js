function vCT(T) {
  let R = T.toLowerCase();
  return /\/zed( \w+)?\.app\//.test(R) || R.endsWith(`${Rn.sep}zed`) || R.endsWith(`${Rn.sep}zed.exe`) || R === "zed" || R === "zed-editor";
}
function H0T(T) {
  let R = T.match(/\/Zed (Preview|Nightly|Dev)\.app\//i);
  if (!R) return /\/Zed\.app\//.test(T) ? "stable" : null;
  let a = R[1].toLowerCase();
  return N0T(a) ? a : null;
}
async function jCT() {
  return (await W0T("sqlite3", ["-version"])).status === 0;
}
async function GiT(T) {
  try {
    return await lN.promises.access(T), !0;
  } catch {
    return !1;
  }
}
async function W0T(T, R, a) {
  try {
    let {
      stdout: e,
      stderr: t
    } = await SCT(T, R, {
      encoding: "utf-8",
      timeout: a?.timeout
    });
    return {
      status: 0,
      stdout: e,
      stderr: t
    };
  } catch (e) {
    let t = e;
    return {
      status: typeof t.code === "number" ? t.code : 1,
      stdout: t.stdout ?? "",
      stderr: t.stderr ?? t.message
    };
  }
}