function Xs() {
  let T = sN(),
    R = {};
  if (R[GlR] = T.name, R[d0T] = T.type, $j) R[VlR] = $j;
  if (vj) R[XlR] = vj;
  if (T.version) R[KlR] = T.version;
  return R;
}
function TAR(T) {
  if (typeof process > "u" || !process.versions?.node) return "unknown";
  try {
    switch (T) {
      case "darwin":
        {
          try {
            let {
                execSync: R
              } = qT("node:child_process"),
              a = R("/usr/bin/sw_vers -productVersion", {
                encoding: "utf8",
                timeout: 3000,
                stdio: ["ignore", "pipe", "ignore"]
              }).trim();
            if (a && /^\d+\.\d+/.test(a)) return a;
          } catch {}
          return qT("node:os").release();
        }
      case "linux":
        try {
          let R = qT("node:fs").readFileSync("/etc/os-release", "utf8").split(`
`);
          for (let a of R) if (a.startsWith("PRETTY_NAME=")) {
            let e = a.match(/PRETTY_NAME="?([^"]*)"?/);
            if (e?.[1]) return e[1];
          }
          return qT("node:os").release();
        } catch {
          return qT("node:os").release();
        }
      case "windows":
        try {
          let {
              execSync: R
            } = qT("node:child_process"),
            a = R('systeminfo | findstr /B /C:"OS Name" /C:"OS Version"', {
              encoding: "utf8",
              timeout: 5000
            }).split(`
`),
            e = a.find(r => r.includes("OS Name")),
            t = a.find(r => r.includes("OS Version"));
          if (e && t) {
            let r = e.split(":")[1]?.trim(),
              h = t.split(":")[1]?.trim();
            return `${r} ${h}`;
          }
          return qT("node:os").release();
        } catch {
          return qT("node:os").release();
        }
      default:
        return "unknown";
    }
  } catch {
    return "unknown";
  }
}