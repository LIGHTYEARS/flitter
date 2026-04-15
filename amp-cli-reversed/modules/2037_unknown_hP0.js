async function hP0(T) {
  let R = RP0(T.previousStatus, T.nextStatus),
    a = T.progressReporter,
    e = {
      writtenFiles: 0,
      restoredFiles: 0,
      deletedFiles: 0,
      unchangedFiles: 0,
      syncedPaths: [],
      removedPaths: []
    };
  for (let t of R.restorePaths) {
    await a?.onPathStart({
      action: "syncing",
      path: t
    });
    let r = await xP0({
      repoRoot: T.repoRoot,
      relativePath: t,
      readRemoteFile: T.readRemoteFile
    });
    if (r.outcome === "written") {
      e.restoredFiles += 1, e.syncedPaths.push(t), await a?.onPathComplete({
        outcome: "updated",
        path: t
      });
      continue;
    }
    if (r.outcome === "deleted") {
      e.deletedFiles += 1, e.removedPaths.push(t), await a?.onPathComplete({
        outcome: "removed",
        path: t
      });
      continue;
    }
    e.unchangedFiles += 1, await a?.onPathComplete({
      outcome: "unchanged",
      path: t
    });
  }
  for (let t of R.syncFiles.filter(r => r.changeType === "deleted")) {
    if (await a?.onPathStart({
      action: "removing",
      path: t.path
    }), await $XT(vtT(T.repoRoot, t.path))) {
      e.deletedFiles += 1, e.removedPaths.push(t.path), await a?.onPathComplete({
        outcome: "removed",
        path: t.path
      });
      continue;
    }
    e.unchangedFiles += 1, await a?.onPathComplete({
      outcome: "unchanged",
      path: t.path
    });
  }
  for (let t of R.syncFiles.filter(r => r.changeType !== "deleted")) {
    await a?.onPathStart({
      action: "updating",
      path: t.path
    });
    let r = await T.readRemoteFile(t.path);
    if ((await gXT({
      repoRoot: T.repoRoot,
      relativePath: t.path,
      content: r
    })) === "written") {
      e.writtenFiles += 1, e.syncedPaths.push(t.path), await a?.onPathComplete({
        outcome: "updated",
        path: t.path
      });
      continue;
    }
    e.unchangedFiles += 1, await a?.onPathComplete({
      outcome: "unchanged",
      path: t.path
    });
  }
  return e;
}