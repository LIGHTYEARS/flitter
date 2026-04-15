async function j40(T = {}) {
  let {
    maxSizeBytes: R = 1048576,
    timeoutMs: a = 30000
  } = T;
  if (process.stdin.isTTY) return {
    content: "",
    truncated: !1,
    timedOut: !1,
    bytesRead: 0
  };
  try {
    if ($40(process.stdin.fd).isCharacterDevice()) {
      let e = `/proc/self/fd/${process.stdin.fd}`;
      try {
        let t = v40(e);
        if (t === "/dev/zero") return J.warn("Detected /dev/zero input, returning empty content to avoid infinite read"), {
          content: "",
          truncated: !1,
          timedOut: !1,
          bytesRead: 0
        };
        if (t === "/dev/random" || t === "/dev/urandom") throw new cB(`Refusing to read from special device: ${t}. This would cause infinite data consumption.`);
      } catch {}
    }
  } catch {}
  return new Promise((e, t) => {
    let r = "",
      h = 0,
      i = !1,
      c = !1,
      s = null,
      A = () => {
        if (s) clearTimeout(s), s = null;
        process.stdin.removeAllListeners("data"), process.stdin.removeAllListeners("end"), process.stdin.removeAllListeners("error");
      },
      l = () => {
        A(), e({
          content: r,
          truncated: i,
          timedOut: c,
          bytesRead: h
        });
      };
    s = setTimeout(() => {
      c = !0, l();
    }, a), process.stdin.once("error", o => {
      A(), t(new cB("Failed to read from stdin", o));
    }), process.stdin.once("end", () => {
      l();
    }), process.stdin.on("data", o => {
      let n = o.length;
      if (h + n > R) {
        let p = R - h;
        if (p > 0) r += o.subarray(0, p).toString("utf8"), h = R;
        i = !0, l();
        return;
      }
      r += o.toString("utf8"), h += n;
    }), process.stdin.resume();
  });
}