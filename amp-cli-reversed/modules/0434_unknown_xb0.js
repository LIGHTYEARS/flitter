async function xb0() {
  let T = !1,
    R = mh.join(H_.homedir(), ".local", "bin");
  if (!dVT(R)) _b0(R, {
    recursive: !0
  });
  if (T) {
    let e = mh.join(R, "amp.bat"),
      t = `@echo off
REM Amp CLI PATH wrapper - simply execs the main script
if defined AMP_HOME (
    "%AMP_HOME%\\bin\\amp.bat" %*
) else (
    "%USERPROFILE%\\.amp\\bin\\amp.bat" %*
)
`;
    exT(e, `@echo off
REM Amp CLI PATH wrapper - simply execs the main script
if defined AMP_HOME (
    "%AMP_HOME%\\bin\\amp.bat" %*
) else (
    "%USERPROFILE%\\.amp\\bin\\amp.bat" %*
)
`);
  } else {
    let e = mh.join(R, "amp"),
      t = `#!/usr/bin/env bash
# Amp CLI PATH wrapper - simply execs the main script
exec "\${AMP_HOME:-$HOME/.amp}/bin/amp" "$@"
`;
    exT(e, `#!/usr/bin/env bash
# Amp CLI PATH wrapper - simply execs the main script
exec "\${AMP_HOME:-$HOME/.amp}/bin/amp" "$@"
`);
    try {
      pb0(e, 493);
    } catch {}
  }
  let a = T ? mh.join(R, "amp.bat") : mh.join(R, "amp");
  rt.green(`\u2713 The wizard's staff is ready at ${yA(a)}`);
}