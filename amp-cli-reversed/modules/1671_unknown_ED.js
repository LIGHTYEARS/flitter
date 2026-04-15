async function ED(T) {
  let R = _N(T);
  try {
    let a = await yL(T);
    if (!a) {
      J.debug("No lock to release", {
        serverName: T
      });
      return;
    }
    if (a.pid !== process.pid) {
      J.warn("Cannot release lock owned by another process", {
        serverName: T,
        ownerPid: a.pid,
        ourPid: process.pid
      });
      return;
    }
    await $r.unlink(R), J.info("Released OAuth lock", {
      serverName: T,
      pid: process.pid
    });
  } catch (a) {
    if (a?.code === "ENOENT") return;
    J.error("Failed to release OAuth lock", {
      serverName: T,
      error: a.message
    });
  }
}