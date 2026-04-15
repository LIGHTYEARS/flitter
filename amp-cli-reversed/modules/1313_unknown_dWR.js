function OWR(T) {
  return typeof T === "string" ? zR.parse(T) : T;
}
function dWR(T) {
  return async (R, ...a) => {
    let e = "";
    for (let t = 0; t < R.length; t++) if (e += R[t], t < a.length) e += String(a[t]);
    try {
      let t = await SWR(e, {
        cwd: T
      });
      return {
        exitCode: 0,
        stdout: t.stdout,
        stderr: t.stderr
      };
    } catch (t) {
      let r = t;
      return {
        exitCode: typeof r.code === "number" ? r.code : 1,
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? ""
      };
    }
  };
}