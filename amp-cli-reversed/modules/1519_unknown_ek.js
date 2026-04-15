function ek(T, R) {
  let a = T.seen.get(R);
  if (!a) throw Error("Unprocessed schema. This is a bug in Zod.");
  let e = new Map();
  for (let h of T.seen.entries()) {
    let i = T.metadataRegistry.get(h[0])?.id;
    if (i) {
      let c = e.get(i);
      if (c && c !== h[0]) throw Error(`Duplicate schema id "${i}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      e.set(i, h[0]);
    }
  }
  let t = h => {
      let i = T.target === "draft-2020-12" ? "$defs" : "definitions";
      if (T.external) {
        let A = T.external.registry.get(h[0])?.id,
          l = T.external.uri ?? (n => n);
        if (A) return {
          ref: l(A)
        };
        let o = h[1].defId ?? h[1].schema.id ?? `schema${T.counter++}`;
        return h[1].defId = o, {
          defId: o,
          ref: `${l("__shared")}#/${i}/${o}`
        };
      }
      if (h[1] === a) return {
        ref: "#"
      };
      let c = `#/${i}/`,
        s = h[1].schema.id ?? `__schema${T.counter++}`;
      return {
        defId: s,
        ref: c + s
      };
    },
    r = h => {
      if (h[1].schema.$ref) return;
      let i = h[1],
        {
          ref: c,
          defId: s
        } = t(h);
      if (i.def = {
        ...i.schema
      }, s) i.defId = s;
      let A = i.schema;
      for (let l in A) delete A[l];
      A.$ref = c;
    };
  if (T.cycles === "throw") for (let h of T.seen.entries()) {
    let i = h[1];
    if (i.cycle) throw Error(`Cycle detected: #/${i.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
  }
  for (let h of T.seen.entries()) {
    let i = h[1];
    if (R === h[0]) {
      r(h);
      continue;
    }
    if (T.external) {
      let c = T.external.registry.get(h[0])?.id;
      if (R !== h[0] && c) {
        r(h);
        continue;
      }
    }
    if (T.metadataRegistry.get(h[0])?.id) {
      r(h);
      continue;
    }
    if (i.cycle) {
      r(h);
      continue;
    }
    if (i.count > 1) {
      if (T.reused === "ref") {
        r(h);
        continue;
      }
    }
  }
}