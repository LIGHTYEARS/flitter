function alR(T) {
  let R = 0,
    a = [];
  while (R < T.length) {
    let e = T[R];
    if (e === "\\") {
      R++;
      continue;
    }
    if (e === "{") {
      a.push({
        type: "brace",
        value: "{"
      }), R++;
      continue;
    }
    if (e === "}") {
      a.push({
        type: "brace",
        value: "}"
      }), R++;
      continue;
    }
    if (e === "[") {
      a.push({
        type: "paren",
        value: "["
      }), R++;
      continue;
    }
    if (e === "]") {
      a.push({
        type: "paren",
        value: "]"
      }), R++;
      continue;
    }
    if (e === ":") {
      a.push({
        type: "separator",
        value: ":"
      }), R++;
      continue;
    }
    if (e === ",") {
      a.push({
        type: "delimiter",
        value: ","
      }), R++;
      continue;
    }
    if (e === '"') {
      let h = "",
        i = !1;
      e = T[++R];
      while (e !== '"') {
        if (R === T.length) {
          i = !0;
          break;
        }
        if (e === "\\") {
          if (R++, R === T.length) {
            i = !0;
            break;
          }
          h += e + T[R], e = T[++R];
        } else h += e, e = T[++R];
      }
      if (e = T[++R], !i) a.push({
        type: "string",
        value: h
      });
      continue;
    }
    if (e && /\s/.test(e)) {
      R++;
      continue;
    }
    let t = /[0-9]/;
    if (e && t.test(e) || e === "-" || e === ".") {
      let h = "";
      if (e === "-") h += e, e = T[++R];
      while (e && t.test(e) || e === ".") h += e, e = T[++R];
      a.push({
        type: "number",
        value: h
      });
      continue;
    }
    let r = /[a-z]/i;
    if (e && r.test(e)) {
      let h = "";
      while (e && r.test(e)) {
        if (R === T.length) break;
        h += e, e = T[++R];
      }
      if (h === "true" || h === "false" || h === "null") a.push({
        type: "name",
        value: h
      });else {
        R++;
        continue;
      }
      continue;
    }
    R++;
  }
  return a;
}