async function FwR(T, R, a) {
  let e = RaT.join(TaT.tmpdir(), `amp-snapshot-${R}-${a}-${Date.now()}`);
  try {
    let t = {
      GIT_INDEX_FILE: e,
      GIT_WORK_TREE: T
    };
    try {
      await ks(["read-tree", "HEAD"], {
        cwd: T,
        env: t
      });
    } catch {
      await ks(["read-tree", "--empty"], {
        cwd: T,
        env: t
      });
    }
    await ks(["add", "-A"], {
      cwd: T,
      env: t
    });
    let r = await ks(["write-tree"], {
        cwd: T,
        env: t
      }),
      h = `refs/amp/snapshots/${R}/${a}`;
    return await ks(["update-ref", "-m", `amp snapshot ${R} ${a}`, h, r], {
      cwd: T
    }), {
      treeOID: r,
      repoRoot: T
    };
  } finally {
    try {
      J3T.unlinkSync(e);
    } catch {}
  }
}