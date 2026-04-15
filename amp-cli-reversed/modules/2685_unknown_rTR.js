class rTR {
  constructor(T) {
    this.suppressValidationErr = !T;
  }
  readDocType(T, R) {
    let a = {};
    if (T[R + 3] === "O" && T[R + 4] === "C" && T[R + 5] === "T" && T[R + 6] === "Y" && T[R + 7] === "P" && T[R + 8] === "E") {
      R = R + 9;
      let e = 1,
        t = !1,
        r = !1,
        h = "";
      for (; R < T.length; R++) if (T[R] === "<" && !r) {
        if (t && P_(T, "!ENTITY", R)) {
          R += 7;
          let i, c;
          if ([i, c, R] = this.readEntityExp(T, R + 1, this.suppressValidationErr), c.indexOf("&") === -1) a[i] = {
            regx: RegExp(`&${i};`, "g"),
            val: c
          };
        } else if (t && P_(T, "!ELEMENT", R)) {
          R += 8;
          let {
            index: i
          } = this.readElementExp(T, R + 1);
          R = i;
        } else if (t && P_(T, "!ATTLIST", R)) R += 8;else if (t && P_(T, "!NOTATION", R)) {
          R += 9;
          let {
            index: i
          } = this.readNotationExp(T, R + 1, this.suppressValidationErr);
          R = i;
        } else if (P_(T, "!--", R)) r = !0;else throw Error("Invalid DOCTYPE");
        e++, h = "";
      } else if (T[R] === ">") {
        if (r) {
          if (T[R - 1] === "-" && T[R - 2] === "-") r = !1, e--;
        } else e--;
        if (e === 0) break;
      } else if (T[R] === "[") t = !0;else h += T[R];
      if (e !== 0) throw Error("Unclosed DOCTYPE");
    } else throw Error("Invalid Tag instead of DOCTYPE");
    return {
      entities: a,
      i: R
    };
  }
  readEntityExp(T, R) {
    R = or(T, R);
    let a = "";
    while (R < T.length && !/\s/.test(T[R]) && T[R] !== '"' && T[R] !== "'") a += T[R], R++;
    if (jg(a), R = or(T, R), !this.suppressValidationErr) {
      if (T.substring(R, R + 6).toUpperCase() === "SYSTEM") throw Error("External entities are not supported");else if (T[R] === "%") throw Error("Parameter entities are not supported");
    }
    let e = "";
    return [R, e] = this.readIdentifierVal(T, R, "entity"), R--, [a, e, R];
  }
  readNotationExp(T, R) {
    R = or(T, R);
    let a = "";
    while (R < T.length && !/\s/.test(T[R])) a += T[R], R++;
    !this.suppressValidationErr && jg(a), R = or(T, R);
    let e = T.substring(R, R + 6).toUpperCase();
    if (!this.suppressValidationErr && e !== "SYSTEM" && e !== "PUBLIC") throw Error(`Expected SYSTEM or PUBLIC, found "${e}"`);
    R += e.length, R = or(T, R);
    let t = null,
      r = null;
    if (e === "PUBLIC") {
      if ([R, t] = this.readIdentifierVal(T, R, "publicIdentifier"), R = or(T, R), T[R] === '"' || T[R] === "'") [R, r] = this.readIdentifierVal(T, R, "systemIdentifier");
    } else if (e === "SYSTEM") {
      if ([R, r] = this.readIdentifierVal(T, R, "systemIdentifier"), !this.suppressValidationErr && !r) throw Error("Missing mandatory system identifier for SYSTEM notation");
    }
    return {
      notationName: a,
      publicIdentifier: t,
      systemIdentifier: r,
      index: --R
    };
  }
  readIdentifierVal(T, R, a) {
    let e = "",
      t = T[R];
    if (t !== '"' && t !== "'") throw Error(`Expected quoted string, found "${t}"`);
    R++;
    while (R < T.length && T[R] !== t) e += T[R], R++;
    if (T[R] !== t) throw Error(`Unterminated ${a} value`);
    return R++, [R, e];
  }
  readElementExp(T, R) {
    R = or(T, R);
    let a = "";
    while (R < T.length && !/\s/.test(T[R])) a += T[R], R++;
    if (!this.suppressValidationErr && !iW(a)) throw Error(`Invalid element name: "${a}"`);
    R = or(T, R);
    let e = "";
    if (T[R] === "E" && P_(T, "MPTY", R)) R += 4;else if (T[R] === "A" && P_(T, "NY", R)) R += 2;else if (T[R] === "(") {
      R++;
      while (R < T.length && T[R] !== ")") e += T[R], R++;
      if (T[R] !== ")") throw Error("Unterminated content model");
    } else if (!this.suppressValidationErr) throw Error(`Invalid Element Expression, found "${T[R]}"`);
    return {
      elementName: a,
      contentModel: e.trim(),
      index: R
    };
  }
  readAttlistExp(T, R) {
    R = or(T, R);
    let a = "";
    while (R < T.length && !/\s/.test(T[R])) a += T[R], R++;
    jg(a), R = or(T, R);
    let e = "";
    while (R < T.length && !/\s/.test(T[R])) e += T[R], R++;
    if (!jg(e)) throw Error(`Invalid attribute name: "${e}"`);
    R = or(T, R);
    let t = "";
    if (T.substring(R, R + 8).toUpperCase() === "NOTATION") {
      if (t = "NOTATION", R += 8, R = or(T, R), T[R] !== "(") throw Error(`Expected '(', found "${T[R]}"`);
      R++;
      let h = [];
      while (R < T.length && T[R] !== ")") {
        let i = "";
        while (R < T.length && T[R] !== "|" && T[R] !== ")") i += T[R], R++;
        if (i = i.trim(), !jg(i)) throw Error(`Invalid notation name: "${i}"`);
        if (h.push(i), T[R] === "|") R++, R = or(T, R);
      }
      if (T[R] !== ")") throw Error("Unterminated list of notations");
      R++, t += " (" + h.join("|") + ")";
    } else {
      while (R < T.length && !/\s/.test(T[R])) t += T[R], R++;
      let h = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
      if (!this.suppressValidationErr && !h.includes(t.toUpperCase())) throw Error(`Invalid attribute type: "${t}"`);
    }
    R = or(T, R);
    let r = "";
    if (T.substring(R, R + 8).toUpperCase() === "#REQUIRED") r = "#REQUIRED", R += 8;else if (T.substring(R, R + 7).toUpperCase() === "#IMPLIED") r = "#IMPLIED", R += 7;else [R, r] = this.readIdentifierVal(T, R, "ATTLIST");
    return {
      elementName: a,
      attributeName: e,
      attributeType: t,
      defaultValue: r,
      index: R
    };
  }
}