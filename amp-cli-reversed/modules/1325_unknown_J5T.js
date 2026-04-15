async function J5T(T, R = u3(process.cwd(), ".agents", "skills"), a = {}) {
  let e = lqR(T),
    t = [],
    r,
    h = !1;
  try {
    if (e.type === "local") {
      if (r = e.url, !Ft(r)) throw Error(`Local path does not exist: ${r}`);
    } else J.info("Cloning skill repository", {
      url: e.url
    }), r = await pqR(e.url, a.signal), h = !0;
    let i = _qR(r, e.skillPath);
    if (i.length === 0) throw Error(`No SKILL.md files found in ${T}`);
    if (a.name && i.length > 1) throw Error(`Cannot use --name when installing multiple skills. Found ${i.length} skills.`);
    BX(R, {
      recursive: !0
    });
    for (let c of i) {
      let s = c === r,
        A = e.type !== "local" ? nqR(e.url) : void 0,
        l = s && A ? A : oqR(c),
        o = a.name ?? l,
        n = u3(R, o);
      try {
        if (Ft(n)) {
          if (!a.overwrite) {
            t.push({
              success: !1,
              skillName: o,
              installedPath: n,
              error: `Skill "${o}" already exists. Use --overwrite to replace it, or --name to install with a different name.`
            });
            continue;
          }
          Rb(n, {
            recursive: !0
          });
        }
        if (s) BX(n, {
          recursive: !0
        }), _uT(u3(c, "SKILL.md"), u3(n, "SKILL.md"));else _uT(c, n, {
          recursive: !0
        });
        if (a.name && a.name !== l) uqR(n, a.name);
        t.push({
          success: !0,
          skillName: o,
          installedPath: n
        }), J.info("Installed skill", {
          skillName: o,
          path: n
        });
      } catch (p) {
        t.push({
          success: !1,
          skillName: o,
          installedPath: n,
          error: p instanceof Error ? p.message : String(p)
        });
      }
    }
    return t;
  } finally {
    if (h && r) try {
      Rb(r, {
        recursive: !0,
        force: !0
      });
    } catch {
      J.debug("Failed to cleanup temp directory", {
        dir: r
      });
    }
  }
}