function bd0(T, R) {
  let a = _d0;
  if (R) {
    let e = R.split(`
`).map(t => `# ${t}`).join(`
`);
    a += e + `
#

`;
  }
  return a += T, a;
}
async function MQT(T) {
  if (T.stdin.isTTY !== !0) {
    let c = "";
    for await (let s of T.stdin) c += s;
    await md0(T, c.trim());
    return;
  }
  let R = await T.resolveEditor();
  if (!R) {
    T.stderr.write(`Error: No editor found. Set the AMP_EDITOR or EDITOR environment variable.
`), T.exit(1);
    return;
  }
  let a = (await T.settings.get("permissions", T.scope)) ?? [],
    e = fj(a),
    t = "";
  if (e.success) t = J2(e.data);else {
    let c = [],
      s = [];
    for (let l = 0; l < a.length; l++) try {
      let o = fj([a[l]]);
      if (o.success && o.data[0]) c.push(o.data[0]);else {
        let n = JSON.stringify(a[l]);
        s.push(`# Error: invalid entry ${l} \u2013 ${n}`);
      }
    } catch {
      let o = JSON.stringify(a[l]);
      s.push(`# Error: invalid entry ${l} \u2013 ${o}`);
    }
    let A = J2(c);
    t = s.length > 0 ? s.join(`
`) + `

` + A : A;
  }
  let r,
    h,
    i = 0;
  try {
    h = await sd0(cIT(pd0(), "amp-permissions-")), r = cIT(h, "permissions.txt");
    let c = bd0(t, T.hint),
      s = !1;
    do {
      await Ad0(r, c, "utf-8");
      try {
        cd0(`${R} "${r}"`, {
          stdio: "inherit"
        });
      } catch (o) {
        T.exit(1);
        return;
      }
      let A = await od0(r, "utf-8"),
        l = await DQT(A);
      if (l.success) await T.settings.set("permissions", l.entries, T.scope), s = !1;else if (c = l.contentWithErrors, s = !0, i++, i > 3) T.stderr.write("aborting, errors unresolved after multiple edit attempts"), T.exit(1);
    } while (s);
    T.exit(0);
  } catch (c) {
    T.stderr.write(`${c instanceof Error ? c.message : "Unknown error"}
`), T.exit(1);
  } finally {
    try {
      if (r) await ld0(r);
      if (h) await nd0(h);
    } catch {}
  }
}