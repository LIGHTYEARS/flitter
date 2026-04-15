class M_ {
  get text() {
    var T, R, a, e, t, r, h, i;
    if (((e = (a = (R = (T = this.candidates) === null || T === void 0 ? void 0 : T[0]) === null || R === void 0 ? void 0 : R.content) === null || a === void 0 ? void 0 : a.parts) === null || e === void 0 ? void 0 : e.length) === 0) return;
    if (this.candidates && this.candidates.length > 1) console.warn("there are multiple candidates in the response, returning text from the first one.");
    let c = "",
      s = !1,
      A = [];
    for (let l of (i = (h = (r = (t = this.candidates) === null || t === void 0 ? void 0 : t[0]) === null || r === void 0 ? void 0 : r.content) === null || h === void 0 ? void 0 : h.parts) !== null && i !== void 0 ? i : []) {
      for (let [o, n] of Object.entries(l)) if (o !== "text" && o !== "thought" && o !== "thoughtSignature" && (n !== null || n !== void 0)) A.push(o);
      if (typeof l.text === "string") {
        if (typeof l.thought === "boolean" && l.thought) continue;
        s = !0, c += l.text;
      }
    }
    if (A.length > 0) console.warn(`there are non-text parts ${A} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`);
    return s ? c : void 0;
  }
  get data() {
    var T, R, a, e, t, r, h, i;
    if (((e = (a = (R = (T = this.candidates) === null || T === void 0 ? void 0 : T[0]) === null || R === void 0 ? void 0 : R.content) === null || a === void 0 ? void 0 : a.parts) === null || e === void 0 ? void 0 : e.length) === 0) return;
    if (this.candidates && this.candidates.length > 1) console.warn("there are multiple candidates in the response, returning data from the first one.");
    let c = "",
      s = [];
    for (let A of (i = (h = (r = (t = this.candidates) === null || t === void 0 ? void 0 : t[0]) === null || r === void 0 ? void 0 : r.content) === null || h === void 0 ? void 0 : h.parts) !== null && i !== void 0 ? i : []) {
      for (let [l, o] of Object.entries(A)) if (l !== "inlineData" && (o !== null || o !== void 0)) s.push(l);
      if (A.inlineData && typeof A.inlineData.data === "string") c += atob(A.inlineData.data);
    }
    if (s.length > 0) console.warn(`there are non-data parts ${s} in the response, returning concatenation of all data parts. Please refer to the non data parts for a full response from model.`);
    return c.length > 0 ? btoa(c) : void 0;
  }
  get functionCalls() {
    var T, R, a, e, t, r, h, i;
    if (((e = (a = (R = (T = this.candidates) === null || T === void 0 ? void 0 : T[0]) === null || R === void 0 ? void 0 : R.content) === null || a === void 0 ? void 0 : a.parts) === null || e === void 0 ? void 0 : e.length) === 0) return;
    if (this.candidates && this.candidates.length > 1) console.warn("there are multiple candidates in the response, returning function calls from the first one.");
    let c = (i = (h = (r = (t = this.candidates) === null || t === void 0 ? void 0 : t[0]) === null || r === void 0 ? void 0 : r.content) === null || h === void 0 ? void 0 : h.parts) === null || i === void 0 ? void 0 : i.filter(s => s.functionCall).map(s => s.functionCall).filter(s => s !== void 0);
    if ((c === null || c === void 0 ? void 0 : c.length) === 0) return;
    return c;
  }
  get executableCode() {
    var T, R, a, e, t, r, h, i, c;
    if (((e = (a = (R = (T = this.candidates) === null || T === void 0 ? void 0 : T[0]) === null || R === void 0 ? void 0 : R.content) === null || a === void 0 ? void 0 : a.parts) === null || e === void 0 ? void 0 : e.length) === 0) return;
    if (this.candidates && this.candidates.length > 1) console.warn("there are multiple candidates in the response, returning executable code from the first one.");
    let s = (i = (h = (r = (t = this.candidates) === null || t === void 0 ? void 0 : t[0]) === null || r === void 0 ? void 0 : r.content) === null || h === void 0 ? void 0 : h.parts) === null || i === void 0 ? void 0 : i.filter(A => A.executableCode).map(A => A.executableCode).filter(A => A !== void 0);
    if ((s === null || s === void 0 ? void 0 : s.length) === 0) return;
    return (c = s === null || s === void 0 ? void 0 : s[0]) === null || c === void 0 ? void 0 : c.code;
  }
  get codeExecutionResult() {
    var T, R, a, e, t, r, h, i, c;
    if (((e = (a = (R = (T = this.candidates) === null || T === void 0 ? void 0 : T[0]) === null || R === void 0 ? void 0 : R.content) === null || a === void 0 ? void 0 : a.parts) === null || e === void 0 ? void 0 : e.length) === 0) return;
    if (this.candidates && this.candidates.length > 1) console.warn("there are multiple candidates in the response, returning code execution result from the first one.");
    let s = (i = (h = (r = (t = this.candidates) === null || t === void 0 ? void 0 : t[0]) === null || r === void 0 ? void 0 : r.content) === null || h === void 0 ? void 0 : h.parts) === null || i === void 0 ? void 0 : i.filter(A => A.codeExecutionResult).map(A => A.codeExecutionResult).filter(A => A !== void 0);
    if ((s === null || s === void 0 ? void 0 : s.length) === 0) return;
    return (c = s === null || s === void 0 ? void 0 : s[0]) === null || c === void 0 ? void 0 : c.output;
  }
}