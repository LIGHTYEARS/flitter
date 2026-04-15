function YXR(T) {
  if (T === 0) return !1;
  return {
    level: T,
    hasBasic: !0,
    has256: T >= 2,
    has16m: T >= 3
  };
}
function QXR(T, {
  streamIsTTY: R,
  sniffFlags: a = !0
} = {}) {
  let e = XXR();
  if (e !== void 0) nw = e;
  let t = a ? nw : e;
  if (t === 0) return 0;
  if (a) {
    if (Ti("color=16m") || Ti("color=full") || Ti("color=truecolor")) return 3;
    if (Ti("color=256")) return 2;
  }
  if ("TF_BUILD" in ea && "AGENT_NAME" in ea) return 1;
  if (T && !R && t === void 0) return 0;
  let r = t || 0;
  if (ea.TERM === "dumb") return r;
  if (UaT.platform === "win32") {
    let h = VXR.release().split(".");
    if (Number(h[0]) >= 10 && Number(h[2]) >= 10586) return Number(h[2]) >= 14931 ? 3 : 2;
    return 1;
  }
  if ("CI" in ea) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some(h => h in ea)) return 3;
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some(h => h in ea) || ea.CI_NAME === "codeship") return 1;
    return r;
  }
  if ("TEAMCITY_VERSION" in ea) return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(ea.TEAMCITY_VERSION) ? 1 : 0;
  if (ea.COLORTERM === "truecolor") return 3;
  if (ea.TERM === "xterm-kitty") return 3;
  if ("TERM_PROGRAM" in ea) {
    let h = Number.parseInt((ea.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (ea.TERM_PROGRAM) {
      case "iTerm.app":
        return h >= 3 ? 3 : 2;
      case "Apple_Terminal":
        return 2;
    }
  }
  if (/-256(color)?$/i.test(ea.TERM)) return 2;
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(ea.TERM)) return 1;
  if ("COLORTERM" in ea) return 1;
  return r;
}