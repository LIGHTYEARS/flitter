async function P1R(T) {
  let R = {
    displayName: MR.basename(T)
  };
  if (!Pj(T)) return R;
  R.uri = d0(T);
  try {
    if (!(await lFT.access(AFT.join(T.fsPath, ".git")).then(() => !0).catch(() => !1))) return R;
    let {
      stdout: a
    } = await yz("git remote get-url origin", {
      cwd: T.fsPath
    }).catch(() => ({
      stdout: ""
    }));
    if (!a.trim()) return R;
    let {
        stdout: e
      } = await yz("git symbolic-ref HEAD", {
        cwd: T.fsPath
      }).catch(() => ({
        stdout: ""
      })),
      {
        stdout: t
      } = await yz("git rev-parse HEAD", {
        cwd: T.fsPath
      }).catch(() => ({
        stdout: ""
      }));
    return {
      ...R,
      repository: {
        type: "git",
        url: pFT(a.trim()),
        ref: e.trim() || void 0,
        sha: t.trim() ?? void 0
      }
    };
  } catch (a) {
    return J.error("Error getting repository info:", a, {
      dir: T.fsPath
    }), R;
  }
}