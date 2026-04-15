async function Ew(T, R = {}) {
  if (R.currentExecutablePath) return yb0(T, R.currentExecutablePath);
  let {
    reason: a,
    output: e
  } = await fb("amp", ["--version"]);
  switch (a) {
    case "success":
      {
        let t = e.trim().split(" ")[0];
        if (t === T) return {
          status: "same"
        };else {
          let r = await CVT(),
            h = `[WARN] Found amp ${t} in PATH, but expected ${T}. Another version is installed.`;
          if (r.length > 0) {
            h += `
[WARN] Found amp executables at these locations:`;
            for (let i of r) h += `
  ${yA(i)}`;
          }
          return h += `
[WARN] To resolve this, ensure the correct amp is at the front of your PATH.`, h += `
[WARN] Run "${LVT()}" in your shell to see which amp executable is currently being used.`, {
            status: "different",
            warning: h
          };
        }
      }
    case "missing":
      return {
        status: "missing",
        warning: "[WARN] amp not accessible via PATH"
      };
    case "fail":
      {
        let t = '[WARN] failed to run "amp --version":';
        if (e) t += `
${e.trim()}`;
        return {
          status: "fail",
          warning: t
        };
      }
  }
}