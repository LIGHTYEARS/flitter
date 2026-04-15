function PkR(T) {
  return {
    homeDir: T.userConfigDir ? d0(T.userConfigDir) : null
  };
}
function Q9T(T) {
  if (T.path === "/" || T.path === "") return !0;
  let R = T.fsPath;
  if (R === "/" || R === "/Users" || R === "/home" || /^[A-Z]:[\\/?]?$/.test(R)) return !0;
  if (["/proc", "/sys", "/dev"].includes(R)) return !0;
  return !1;
}