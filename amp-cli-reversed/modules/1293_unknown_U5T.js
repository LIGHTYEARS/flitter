function rWR(T, R) {
  if (T?.code === "ENOENT") return Error(`ripgrep exited with code 2:
rg: ${R}: No such file or directory (os error 2)`);
  return T instanceof Error ? T : Error(String(T));
}
async function U5T(T, R, a, e) {
  let t = aWR(a.limit),
    r = ["--files", "--color", "never", "--hidden", "--follow", "--glob", "!\\.git/", "--glob", "!\\.jj/"];
  if (a.maxDepth !== void 0) r.push("--max-depth", a.maxDepth.toString());
  let h;
  if (a.basePath) c4T(a.basePath), h = An(a.basePath) ? a.basePath : MR.joinPath(T, a.basePath).fsPath;else h = T.fsPath;
  try {
    await w5T.lstat(h);
  } catch (s) {
    throw rWR(s, h);
  }
  if (r.push(h), R?.pattern && R.pattern === "*") R.pattern = "**";
  let i = R?.pattern ? dHR.default(R.pattern, {
      nocase: R.caseInsensitive,
      dot: !0
    }) : void 0,
    c = EHR(await faT(), r, {
      stdio: ["ignore", "pipe", "pipe"],
      detached: !0,
      env: {
        ...process.env,
        NONINTERACTIVE: "1",
        DEBIAN_FRONTEND: "noninteractive"
      }
    });
  if (wpR(c), a.signal?.aborted) return hcT(c), {
    files: [],
    remaining: 0,
    aborted: !0
  };
  return a.signal?.addEventListener("abort", () => {
    hcT(c);
  }), new Promise((s, A) => {
    let l = [],
      o = "",
      n = "",
      p = a.offset ?? 0,
      _ = !1,
      m = () => {
        if (_) return;
        if (!n) return;
        let b = n.startsWith(h) ? n.slice(h.length + 1) : n;
        if (i && !i(b)) return;
        let y = n;
        if (n = "", p > 0) {
          p--;
          return;
        }
        if (l.push(y), l.length >= tuT) J.debug("Glob limit reached. Returning partial results.", {
          glob: R?.pattern,
          limit: tuT,
          dir: T
        }), c.kill(), _ = !0, s({
          files: l,
          remaining: 0,
          aborted: !0
        });
      };
    c.stdout?.on("data", b => {
      for (let y of String(b)) {
        if (y === "\r") continue;
        if (y === `
`) m(), n = "";else n += y;
      }
    }), c?.stderr?.on("data", b => {
      if (o.length >= cz) return;
      let y = String(b);
      if (o.length + y.length > cz) o += y.slice(0, cz - o.length);else o += y;
    }), c.on("exit", b => {
      if (_) return;
      if (_ = !0, b && b >= 2) if (tWR(o, h)) J.warn("Ignoring broken descendant symlink while globbing files.", {
        basePath: h,
        glob: R?.pattern,
        stderr: o
      });else {
        A(Error(`ripgrep exited with code ${b}:
${o}`));
        return;
      }
      m();
      let y = l.slice(0, t);
      s({
        files: y,
        remaining: l.length - y.length
      });
    });
  });
}