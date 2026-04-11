// Module: unknown-kvT
// Original: kvT
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: kvT (CJS)
(T, R) => {
  R.exports = h;
  var a = Gs(),
    e = Ax(),
    t = Fe();
  function r(i, c, s, A) {
    return c.delimited
      ? i(
          "types[%i].encode(%s,w.uint32(%i)).uint32(%i)",
          s,
          A,
          ((c.id << 3) | 3) >>> 0,
          ((c.id << 3) | 4) >>> 0,
        )
      : i(
          "types[%i].encode(%s,w.uint32(%i).fork()).ldelim()",
          s,
          A,
          ((c.id << 3) | 2) >>> 0,
        );
  }
  function h(i) {
    var c = t.codegen(["m", "w"], i.name + "$encode")("if(!w)")(
        "w=Writer.create()",
      ),
      s,
      A,
      l = i.fieldsArray.slice().sort(t.compareFieldsById);
    for (var s = 0; s < l.length; ++s) {
      var o = l[s].resolve(),
        n = i._fieldsArray.indexOf(o),
        p = o.resolvedType instanceof a ? "int32" : o.type,
        _ = e.basic[p];
      if (((A = "m" + t.safeProp(o.name)), o.map)) {
        if (
          (c(
            "if(%s!=null&&Object.hasOwnProperty.call(m,%j)){",
            A,
            o.name,
          )("for(var ks=Object.keys(%s),i=0;i<ks.length;++i){", A)(
            "w.uint32(%i).fork().uint32(%i).%s(ks[i])",
            ((o.id << 3) | 2) >>> 0,
            8 | e.mapKey[o.keyType],
            o.keyType,
          ),
          _ === void 0)
        )
          c(
            "types[%i].encode(%s[ks[i]],w.uint32(18).fork()).ldelim().ldelim()",
            n,
            A,
          );
        else c(".uint32(%i).%s(%s[ks[i]]).ldelim()", 16 | _, p, A);
        c("}")("}");
      } else if (o.repeated) {
        if (
          (c("if(%s!=null&&%s.length){", A, A),
          o.packed && e.packed[p] !== void 0)
        )
          c("w.uint32(%i).fork()", ((o.id << 3) | 2) >>> 0)(
            "for(var i=0;i<%s.length;++i)",
            A,
          )(
            "w.%s(%s[i])",
            p,
            A,
          )("w.ldelim()");
        else if ((c("for(var i=0;i<%s.length;++i)", A), _ === void 0))
          r(c, o, n, A + "[i]");
        else c("w.uint32(%i).%s(%s[i])", ((o.id << 3) | _) >>> 0, p, A);
        c("}");
      } else {
        if (o.optional)
          c("if(%s!=null&&Object.hasOwnProperty.call(m,%j))", A, o.name);
        if (_ === void 0) r(c, o, n, A);
        else c("w.uint32(%i).%s(%s)", ((o.id << 3) | _) >>> 0, p, A);
      }
    }
    return c("return w");
  }
};
