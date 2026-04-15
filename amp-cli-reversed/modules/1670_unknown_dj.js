async function dj(T) {
  await vpR();
  let R = _N(T),
    a = await yL(T);
  if (a) if (zW(a)) {
    J.info("Removing stale OAuth lock", {
      serverName: T,
      stalePid: a.pid,
      ageMs: Date.now() - a.timestamp
    });
    try {
      await $r.unlink(R);
    } catch {}
  } else return J.debug("OAuth lock held by another process", {
    serverName: T,
    holderPid: a.pid,
    ageMs: Date.now() - a.timestamp
  }), {
    acquired: !1,
    holder: a
  };
  let e = {
      pid: process.pid,
      timestamp: Date.now(),
      hostname: qT("node:os").hostname()
    },
    t = JSON.stringify(e),
    r = `${R}.${process.pid}.${IpR(4).toString("hex")}`;
  try {
    let h = await $r.open(r, "wx", 384);
    try {
      await h.writeFile(t), await h.sync();
    } finally {
      await h.close();
    }
    try {
      return await $r.link(r, R), await $r.unlink(r).catch(() => {}), J.info("Acquired OAuth lock", {
        serverName: T,
        pid: process.pid
      }), {
        acquired: !0
      };
    } catch (i) {
      if (await $r.unlink(r).catch(() => {}), i?.code === "EEXIST") {
        let c = await yL(T);
        if (c && !zW(c)) return J.debug("Lost OAuth lock race to another process", {
          serverName: T,
          winnerPid: c.pid
        }), {
          acquired: !1,
          holder: c
        };
        return dj(T);
      }
      throw i;
    }
  } catch (h) {
    if (await $r.unlink(r).catch(() => {}), h?.code === "EEXIST") {
      let i = await yL(T);
      if (i && !zW(i)) return {
        acquired: !1,
        holder: i
      };
      return dj(T);
    }
    throw J.error("Failed to acquire OAuth lock", {
      serverName: T,
      error: h.message
    }), h;
  }
}