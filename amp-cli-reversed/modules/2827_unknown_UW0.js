function vW0(T) {
  if (T.status === "done" && typeof T.result === "object") {
    let R = jW0(T.result);
    if (R !== void 0) return R;
  }
  return;
}
function R2(T) {
  if (T && typeof T === "object" && "output" in T) {
    let R = T.output;
    return typeof R === "string" ? R : void 0;
  }
  return;
}
function jW0(T) {
  if (T && typeof T === "object" && "exitCode" in T) {
    let R = T.exitCode;
    return typeof R === "number" ? R : void 0;
  }
  return;
}
function tL(T) {
  let R = T.trimEnd();
  if (!R) return "No output.";
  let a = R.split(`
`),
    e = 6;
  if (a.length <= e) return R;
  return `${a.slice(0, e).join(`
`)}
...`;
}
function UW0(T, R = new Map()) {
  let a = [],
    e = [],
    t = 0,
    r = 0,
    h = 0,
    i = 0,
    c,
    s,
    A = () => {
      if (e.length === 0) return;
      i += 1, a.push({
        type: "activity-group",
        id: `dense-group-${i}`,
        sourceIndex: c,
        assistantSourceIndex: s,
        reads: t,
        searches: r,
        explores: h,
        actions: e
      }), e = [], t = 0, r = 0, h = 0, c = void 0, s = void 0;
    };
  for (let [l, o] of T.entries()) {
    if (o.type === "message") {
      let m = WW0(o);
      if (m.length > 0) e.push(...m), c = l, s = l;
      let b = HW0(o, l);
      if (b) A(), a.push(b);
      continue;
    }
    let n = o.toolUse,
      p = n.normalizedName ?? n.name;
    if (p === jgT || p === SW0) {
      let m = eq0(n);
      if (m) {
        let b = fW0(m);
        if (b.kind !== "command") {
          let y = IW0(m);
          if (y) {
            let u = gW0(m, o.toolResult.run),
              P = $b(o.toolResult.run);
            if (e.push({
              kind: b.kind,
              title: y,
              detail: u?.output,
              guidanceFiles: P,
              command: u?.command,
              status: u?.status,
              exitCode: u?.exitCode
            }), b.kind === "read") t += 1;
            if (b.kind === "search") r += 1;
            if (b.kind === "list") h += 1;
            c = l;
            continue;
          }
        }
        A(), a.push(p === jgT ? Tq0(o, m, l, R.get(o.toolUse.id)) : Rq0(o, m, l, R.get(o.toolUse.id)));
        continue;
      } else {
        let b = o.toolResult.run.status;
        if (b === "in-progress" || b === "queued") {
          c = l;
          continue;
        }
      }
    }
    if (p === DW0) {
      let m = GW0(o);
      if (m) {
        e.push(m), r += 1, c = l;
        continue;
      }
    }
    if (p === wW0) {
      let m = VW0(o);
      if (m) {
        e.push(m), c = l;
        continue;
      }
    }
    if (p === BW0) {
      let m = YW0(o);
      if (m) {
        e.push(m), t += 1, c = l;
        continue;
      }
    }
    if (p === NW0) {
      let m = ZW0(o);
      if (m) {
        e.push(m), h += 1, c = l;
        continue;
      }
    }
    A();
    let _ = qW0(p, o, l);
    if (_) a.push(_);
  }
  return A(), a;
}