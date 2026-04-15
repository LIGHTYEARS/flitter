async function OAR() {
  return (await D0T("sqlite3", ["-version"])).status === 0;
}
async function D0T(T, R, a) {
  try {
    let {
      stdout: e,
      stderr: t
    } = await uCT(T, R, {
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