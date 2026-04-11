// Module: unknown-Qs
// Original: Qs
// Type: ESM (PT wrapper)
// Exports: Bg, js
// Category: unknown

// Module: qS (ESM)
() => {
  (Ge(),
    (HdT = /^\w[\w\d+.-]*$/),
    (WdT = /^\//),
    (qdT = /^\/\//),
    (zdT = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/),
    (x_ = class extends zR {
      _formatted = null;
      _fsPath = null;
      get fsPath() {
        if (!this._fsPath) this._fsPath = NdT(this, !1);
        return this._fsPath;
      }
      toString(R = !1) {
        if (!R) {
          if (!this._formatted) this._formatted = u2(this, !1);
          return this._formatted;
        }
        return u2(this, !0);
      }
      toJSON() {
        let R = {};
        if (this._fsPath)
          ((R.fsPath = this._fsPath), (R._sep = BdT(this.platform)));
        if (this._formatted) R.external = this._formatted;
        if (
          ((R.scheme = this.scheme),
          (R.authority = this.authority),
          (R.path = this.path),
          (R.query = this.query),
          (R.fragment = this.fragment),
          this.platform)
        )
          R.platform = this.platform;
        return R;
      }
    }),
    (b0T = {
      58: "%3A",
      47: "%2F",
      63: "%3F",
      35: "%23",
      91: "%5B",
      93: "%5D",
      64: "%40",
      33: "%21",
      36: "%24",
      38: "%26",
      39: "%27",
      40: "%28",
      41: "%29",
      42: "%2A",
      43: "%2B",
      44: "%2C",
      59: "%3B",
      61: "%3D",
      32: "%20",
    }),
    (y2 = /(%[0-9A-Za-z][0-9A-Za-z])+/g),
    (nn = K.string().brand()));
};
