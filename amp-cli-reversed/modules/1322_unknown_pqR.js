async function pqR(T, R) {
  if (!(await AqR())) throw Error("Git is not installed or not available in PATH. Please install git first.");
  let a = u3(sqR(), `amp-skill-${iqR(8).toString("hex")}`);
  return BX(a, {
    recursive: !0
  }), new Promise((e, t) => {
    let r = !1,
      h = Q5T("git", ["clone", "--depth", "1", T, a], {
        stdio: ["ignore", "pipe", "pipe"]
      }),
      i = setTimeout(() => {
        if (!r) r = !0, h.kill(), Rb(a, {
          recursive: !0,
          force: !0
        }), t(Error(`Git clone timed out after ${buT / 1000} seconds`));
      }, buT),
      c = "";
    h.stderr?.on("data", s => {
      c += s.toString();
    }), R?.addEventListener("abort", () => {
      if (!r) r = !0, clearTimeout(i), h.kill(), Rb(a, {
        recursive: !0,
        force: !0
      }), t(Error("Clone aborted"));
    }), h.on("close", s => {
      if (r) return;
      if (r = !0, clearTimeout(i), s === 0) e(a);else Rb(a, {
        recursive: !0,
        force: !0
      }), t(Error(`Git clone failed: ${c.trim() || "Unknown error"}`));
    }), h.on("error", s => {
      if (r) return;
      r = !0, clearTimeout(i), Rb(a, {
        recursive: !0,
        force: !0
      }), t(Error(`Failed to run git: ${s.message}`));
    });
  });
}