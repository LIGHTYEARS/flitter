// Module: unknown-mvT
// Original: mvT
// Type: CJS (RT wrapper)
// Exports: (none)
// Category: unknown

// Module: mvT (CJS)
(T, R) => {
  R.exports = h;
  var a = Gs(),
    e = Ax(),
    t = Fe();
  function r(i) {
    return "missing required '" + i.name + "'";
  }
  function h(i) {
    var c = t.codegen(
        ["r", "l", "e"],
        i.name + "$decode",
      )("if(!(r instanceof Reader))")("r=Reader.create(r)")(
        "var c=l===undefined?r.len:r.pos+l,m=new this.ctor" +
          (i.fieldsArray.filter(function (p) {
            return p.map;
          }).length
            ? ",k,value"
            : ""),
      )("while(r.pos<c){")("var t=r.uint32()")("if(t===e)")("break")(
        "switch(t>>>3){",
      ),
      s = 0;
    for (; s < i.fieldsArray.length; ++s) {
      var A = i._fieldsArray[s].resolve(),
        l = A.resolvedType instanceof a ? "int32" : A.type,
        o = "m" + t.safeProp(A.name);
      if ((c("case %i: {", A.id), A.map)) {
        if (
          (c("if(%s===util.emptyObject)", o)("%s={}", o)(
            "var c2 = r.uint32()+r.pos",
          ),
          e.defaults[A.keyType] !== void 0)
        )
          c("k=%j", e.defaults[A.keyType]);
        else c("k=null");
        if (e.defaults[l] !== void 0) c("value=%j", e.defaults[l]);
        else c("value=null");
        if (
          (c("while(r.pos<c2){")("var tag2=r.uint32()")("switch(tag2>>>3){")(
            "case 1: k=r.%s(); break",
            A.keyType,
          )("case 2:"),
          e.basic[l] === void 0)
        )
          c("value=types[%i].decode(r,r.uint32())", s);
        else c("value=r.%s()", l);
        if (
          (c("break")("default:")("r.skipType(tag2&7)")("break")("}")("}"),
          e.long[A.keyType] !== void 0)
        )
          c('%s[typeof k==="object"?util.longToHash(k):k]=value', o);
        else c("%s[k]=value", o);
      } else if (A.repeated) {
        if (
          (c("if(!(%s&&%s.length))", o, o)("%s=[]", o), e.packed[l] !== void 0)
        )
          c("if((t&7)===2){")("var c2=r.uint32()+r.pos")("while(r.pos<c2)")(
            "%s.push(r.%s())",
            o,
            l,
          )("}else");
        if (e.basic[l] === void 0)
          c(
            A.delimited
              ? "%s.push(types[%i].decode(r,undefined,((t&~7)|4)))"
              : "%s.push(types[%i].decode(r,r.uint32()))",
            o,
            s,
          );
        else c("%s.push(r.%s())", o, l);
      } else if (e.basic[l] === void 0)
        c(
          A.delimited
            ? "%s=types[%i].decode(r,undefined,((t&~7)|4))"
            : "%s=types[%i].decode(r,r.uint32())",
          o,
          s,
        );
      else c("%s=r.%s()", o, l);
      c("break")("}");
    }
    c("default:")("r.skipType(t&7)")("break")("}")("}");
    for (s = 0; s < i._fieldsArray.length; ++s) {
      var n = i._fieldsArray[s];
      if (n.required)
        c("if(!m.hasOwnProperty(%j))", n.name)(
          "throw util.ProtocolError(%j,{instance:m})",
          r(n),
        );
    }
    return c("return m");
  }
};
