class qBT {
  get text() {
    var T, R, a;
    let e = "",
      t = !1,
      r = [];
    for (let h of (a = (R = (T = this.serverContent) === null || T === void 0 ? void 0 : T.modelTurn) === null || R === void 0 ? void 0 : R.parts) !== null && a !== void 0 ? a : []) {
      for (let [i, c] of Object.entries(h)) if (i !== "text" && i !== "thought" && c !== null) r.push(i);
      if (typeof h.text === "string") {
        if (typeof h.thought === "boolean" && h.thought) continue;
        t = !0, e += h.text;
      }
    }
    if (r.length > 0) console.warn(`there are non-text parts ${r} in the response, returning concatenation of all text parts. Please refer to the non text parts for a full response from model.`);
    return t ? e : void 0;
  }
  get data() {
    var T, R, a;
    let e = "",
      t = [];
    for (let r of (a = (R = (T = this.serverContent) === null || T === void 0 ? void 0 : T.modelTurn) === null || R === void 0 ? void 0 : R.parts) !== null && a !== void 0 ? a : []) {
      for (let [h, i] of Object.entries(r)) if (h !== "inlineData" && i !== null) t.push(h);
      if (r.inlineData && typeof r.inlineData.data === "string") e += atob(r.inlineData.data);
    }
    if (t.length > 0) console.warn(`there are non-data parts ${t} in the response, returning concatenation of all data parts. Please refer to the non data parts for a full response from model.`);
    return e.length > 0 ? btoa(e) : void 0;
  }
}