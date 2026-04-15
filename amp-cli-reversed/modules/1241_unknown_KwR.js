async function GwR(T) {
  try {
    return await ks(["rev-parse", "--git-dir"], {
      cwd: T
    }), !0;
  } catch {
    return !1;
  }
}
async function KwR(T) {
  let R = RaT.join(TaT.tmpdir(), `amp-restore-${Date.now()}`);
  try {
    let a = {
      GIT_INDEX_FILE: R,
      GIT_WORK_TREE: T.repoRoot
    };
    try {
      await ks(["read-tree", "HEAD"], {
        cwd: T.repoRoot,
        env: a
      });
    } catch {
      await ks(["read-tree", "--empty"], {
        cwd: T.repoRoot,
        env: a
      });
    }
    await ks(["add", "-A"], {
      cwd: T.repoRoot,
      env: a
    }), await ks(["checkout", "--no-overlay", T.treeOID, "--", "."], {
      cwd: T.repoRoot,
      env: a
    });
  } finally {
    try {
      J3T.unlinkSync(R);
    } catch {}
  }
}