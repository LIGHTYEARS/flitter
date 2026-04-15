function DdT(T, R) {
  if (T.not !== void 0) {
    if (typeof T.not === "object" && Object.keys(T.not).length === 0) return p0.never();
    throw Error("not is not supported in Zod (except { not: {} } for never)");
  }
  if (T.unevaluatedItems !== void 0) throw Error("unevaluatedItems is not supported");
  if (T.unevaluatedProperties !== void 0) throw Error("unevaluatedProperties is not supported");
  if (T.if !== void 0 || T.then !== void 0 || T.else !== void 0) throw Error("Conditional schemas (if/then/else) are not supported");
  if (T.dependentSchemas !== void 0 || T.dependentRequired !== void 0) throw Error("dependentSchemas and dependentRequired are not supported");
  if (T.$ref) {
    let t = T.$ref;
    if (R.refs.has(t)) return R.refs.get(t);
    if (R.processing.has(t)) return p0.lazy(() => {
      if (!R.refs.has(t)) throw Error(`Circular reference not resolved: ${t}`);
      return R.refs.get(t);
    });
    R.processing.add(t);
    let r = QoR(t, R),
      h = at(r, R);
    return R.refs.set(t, h), R.processing.delete(t), h;
  }
  if (T.enum !== void 0) {
    let t = T.enum;
    if (R.version === "openapi-3.0" && T.nullable === !0 && t.length === 1 && t[0] === null) return p0.null();
    if (t.length === 0) return p0.never();
    if (t.length === 1) return p0.literal(t[0]);
    if (t.every(h => typeof h === "string")) return p0.enum(t);
    let r = t.map(h => p0.literal(h));
    if (r.length < 2) return r[0];
    return p0.union([r[0], r[1], ...r.slice(2)]);
  }
  if (T.const !== void 0) return p0.literal(T.const);
  let a = T.type;
  if (Array.isArray(a)) {
    let t = a.map(r => {
      let h = {
        ...T,
        type: r
      };
      return DdT(h, R);
    });
    if (t.length === 0) return p0.never();
    if (t.length === 1) return t[0];
    return p0.union(t);
  }
  if (!a) return p0.any();
  let e;
  switch (a) {
    case "string":
      {
        let t = p0.string();
        if (T.format) {
          let r = T.format;
          if (r === "email") t = t.check(p0.email());else if (r === "uri" || r === "uri-reference") t = t.check(p0.url());else if (r === "uuid" || r === "guid") t = t.check(p0.uuid());else if (r === "date-time") t = t.check(p0.iso.datetime());else if (r === "date") t = t.check(p0.iso.date());else if (r === "time") t = t.check(p0.iso.time());else if (r === "duration") t = t.check(p0.iso.duration());else if (r === "ipv4") t = t.check(p0.ipv4());else if (r === "ipv6") t = t.check(p0.ipv6());else if (r === "mac") t = t.check(p0.mac());else if (r === "cidr") t = t.check(p0.cidrv4());else if (r === "cidr-v6") t = t.check(p0.cidrv6());else if (r === "base64") t = t.check(p0.base64());else if (r === "base64url") t = t.check(p0.base64url());else if (r === "e164") t = t.check(p0.e164());else if (r === "jwt") t = t.check(p0.jwt());else if (r === "emoji") t = t.check(p0.emoji());else if (r === "nanoid") t = t.check(p0.nanoid());else if (r === "cuid") t = t.check(p0.cuid());else if (r === "cuid2") t = t.check(p0.cuid2());else if (r === "ulid") t = t.check(p0.ulid());else if (r === "xid") t = t.check(p0.xid());else if (r === "ksuid") t = t.check(p0.ksuid());
        }
        if (typeof T.minLength === "number") t = t.min(T.minLength);
        if (typeof T.maxLength === "number") t = t.max(T.maxLength);
        if (T.pattern) t = t.regex(new RegExp(T.pattern));
        e = t;
        break;
      }
    case "number":
    case "integer":
      {
        let t = a === "integer" ? p0.number().int() : p0.number();
        if (typeof T.minimum === "number") t = t.min(T.minimum);
        if (typeof T.maximum === "number") t = t.max(T.maximum);
        if (typeof T.exclusiveMinimum === "number") t = t.gt(T.exclusiveMinimum);else if (T.exclusiveMinimum === !0 && typeof T.minimum === "number") t = t.gt(T.minimum);
        if (typeof T.exclusiveMaximum === "number") t = t.lt(T.exclusiveMaximum);else if (T.exclusiveMaximum === !0 && typeof T.maximum === "number") t = t.lt(T.maximum);
        if (typeof T.multipleOf === "number") t = t.multipleOf(T.multipleOf);
        e = t;
        break;
      }
    case "boolean":
      {
        e = p0.boolean();
        break;
      }
    case "null":
      {
        e = p0.null();
        break;
      }
    case "object":
      {
        let t = {},
          r = T.properties || {},
          h = new Set(T.required || []);
        for (let [c, s] of Object.entries(r)) {
          let A = at(s, R);
          t[c] = h.has(c) ? A : A.optional();
        }
        if (T.propertyNames) {
          let c = at(T.propertyNames, R),
            s = T.additionalProperties && typeof T.additionalProperties === "object" ? at(T.additionalProperties, R) : p0.any();
          if (Object.keys(t).length === 0) {
            e = p0.record(c, s);
            break;
          }
          let A = p0.object(t).passthrough(),
            l = p0.looseRecord(c, s);
          e = p0.intersection(A, l);
          break;
        }
        if (T.patternProperties) {
          let c = T.patternProperties,
            s = Object.keys(c),
            A = [];
          for (let o of s) {
            let n = at(c[o], R),
              p = p0.string().regex(new RegExp(o));
            A.push(p0.looseRecord(p, n));
          }
          let l = [];
          if (Object.keys(t).length > 0) l.push(p0.object(t).passthrough());
          if (l.push(...A), l.length === 0) e = p0.object({}).passthrough();else if (l.length === 1) e = l[0];else {
            let o = p0.intersection(l[0], l[1]);
            for (let n = 2; n < l.length; n++) o = p0.intersection(o, l[n]);
            e = o;
          }
          break;
        }
        let i = p0.object(t);
        if (T.additionalProperties === !1) e = i.strict();else if (typeof T.additionalProperties === "object") e = i.catchall(at(T.additionalProperties, R));else e = i.passthrough();
        break;
      }
    case "array":
      {
        let {
          prefixItems: t,
          items: r
        } = T;
        if (t && Array.isArray(t)) {
          let h = t.map(c => at(c, R)),
            i = r && typeof r === "object" && !Array.isArray(r) ? at(r, R) : void 0;
          if (i) e = p0.tuple(h).rest(i);else e = p0.tuple(h);
          if (typeof T.minItems === "number") e = e.check(p0.minLength(T.minItems));
          if (typeof T.maxItems === "number") e = e.check(p0.maxLength(T.maxItems));
        } else if (Array.isArray(r)) {
          let h = r.map(c => at(c, R)),
            i = T.additionalItems && typeof T.additionalItems === "object" ? at(T.additionalItems, R) : void 0;
          if (i) e = p0.tuple(h).rest(i);else e = p0.tuple(h);
          if (typeof T.minItems === "number") e = e.check(p0.minLength(T.minItems));
          if (typeof T.maxItems === "number") e = e.check(p0.maxLength(T.maxItems));
        } else if (r !== void 0) {
          let h = at(r, R),
            i = p0.array(h);
          if (typeof T.minItems === "number") i = i.min(T.minItems);
          if (typeof T.maxItems === "number") i = i.max(T.maxItems);
          e = i;
        } else e = p0.array(p0.any());
        break;
      }
    default:
      throw Error(`Unsupported type: ${a}`);
  }
  if (T.description) e = e.describe(T.description);
  if (T.default !== void 0) e = e.default(T.default);
  return e;
}