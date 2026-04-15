function BcR() {
  return {
    localeError: NcR()
  };
}
function HcR() {
  return {
    localeError: WcR()
  };
}
function zcR() {
  return {
    localeError: FcR()
  };
}
function KcR() {
  return {
    localeError: VcR()
  };
}
function YcR() {
  return {
    localeError: QcR()
  };
}
function JcR() {
  return {
    localeError: TsR()
  };
}
function KjT() {
  return {
    localeError: asR()
  };
}
function esR() {
  return KjT();
}
function rsR() {
  return {
    localeError: hsR()
  };
}
function JhT(T) {
  let R = Math.abs(T),
    a = R % 10,
    e = R % 100;
  if (e >= 11 && e <= 19 || a === 0) return "many";
  if (a === 1) return "one";
  return "few";
}
function csR() {
  return {
    localeError: ssR()
  };
}
function nsR() {
  return {
    localeError: lsR()
  };
}
function psR() {
  return {
    localeError: _sR()
  };
}
function msR() {
  return {
    localeError: usR()
  };
}
function PsR() {
  return {
    localeError: ksR()
  };
}
function fsR() {
  return {
    localeError: IsR()
  };
}
function $sR() {
  return {
    localeError: vsR()
  };
}
function SsR() {
  return {
    localeError: OsR()
  };
}
function EsR() {
  return {
    localeError: CsR()
  };
}
function TiT(T, R, a, e) {
  let t = Math.abs(T),
    r = t % 10,
    h = t % 100;
  if (h >= 11 && h <= 19) return e;
  if (r === 1) return R;
  if (r >= 2 && r <= 4) return a;
  return e;
}
function MsR() {
  return {
    localeError: DsR()
  };
}
function BsR() {
  return {
    localeError: NsR()
  };
}
function HsR() {
  return {
    localeError: WsR()
  };
}
function zsR() {
  return {
    localeError: FsR()
  };
}
function KsR() {
  return {
    localeError: VsR()
  };
}
function YsR() {
  return {
    localeError: QsR()
  };
}
function XjT() {
  return {
    localeError: JsR()
  };
}
function ToR() {
  return XjT();
}
function aoR() {
  return {
    localeError: eoR()
  };
}
function roR() {
  return {
    localeError: hoR()
  };
}
function coR() {
  return {
    localeError: soR()
  };
}
function noR() {
  return {
    localeError: loR()
  };
}
function poR() {
  return {
    localeError: _oR()
  };
}
function moR() {
  return {
    localeError: uoR()
  };
}
class oRT {
  constructor() {
    this._map = new WeakMap(), this._idmap = new Map();
  }
  add(T, ...R) {
    let a = R[0];
    if (this._map.set(T, a), a && typeof a === "object" && "id" in a) this._idmap.set(a.id, T);
    return this;
  }
  clear() {
    return this._map = new WeakMap(), this._idmap = new Map(), this;
  }
  remove(T) {
    let R = this._map.get(T);
    if (R && typeof R === "object" && "id" in R) this._idmap.delete(R.id);
    return this._map.delete(T), this;
  }
  get(T) {
    let R = T._zod.parent;
    if (R) {
      let a = {
        ...(this.get(R) ?? {})
      };
      delete a.id;
      let e = {
        ...a,
        ...this._map.get(T)
      };
      return Object.keys(e).length ? e : void 0;
    }
    return this._map.get(T);
  }
  has(T) {
    return this._map.has(T);
  }
}