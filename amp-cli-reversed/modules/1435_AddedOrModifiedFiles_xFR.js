async function xFR(T, R, a) {
  let e;
  if (R) e = await kFR(R, a);else e = [["diff", "--name-only", "--diff-filter=AM"], ["ls-files", "--others", "--exclude-standard"]];
  let t = new Set();
  for (let r of e) try {
    let {
      stdout: h
    } = await PFR("git", r, {
      cwd: T.fsPath
    });
    for (let i of h.split(`
`)) {
      let c = i.trim();
      if (c.length > 0) t.add(c);
    }
  } catch (h) {
    J.warn("getAddedOrModifiedFiles failed to execute git command", {
      args: r,
      error: h
    });
  }
  return [...t];
}