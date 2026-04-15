function gOT(T) {
  return TST(u6, T);
}
function $OT(T) {
  return RST(y6, T);
}
function vOT(T) {
  return aST(P6, T);
}
function jOT(T) {
  return eST(k6, T);
}
function eR(T) {
  return QjT(_x, T);
}
function COT(T) {
  return pRT(Rj, T);
}
function LOT(T) {
  return pD(yP, T);
}
function MOT(T) {
  return _RT(tc, T);
}
function DOT(T) {
  return bRT(tc, T);
}
function wOT(T) {
  return mRT(tc, T);
}
function BOT(T) {
  return uRT(tc, T);
}
function JRT(T) {
  return a6(rk, T);
}
function NOT(T) {
  return a6(rk, {
    protocol: /^https?$/,
    hostname: cm.domain,
    ...V9.normalizeParams(T)
  });
}
function UOT(T) {
  return yRT(aj, T);
}
function HOT(T) {
  return PRT(ej, T);
}
function WOT(T) {
  return kRT(tj, T);
}
function qOT(T) {
  return xRT(rj, T);
}
function zOT(T) {
  return fRT(hj, T);
}
function FOT(T) {
  return IRT(ij, T);
}
function GOT(T) {
  return gRT(cj, T);
}
function KOT(T) {
  return $RT(sj, T);
}
function VOT(T) {
  return JjT(I6, T);
}
function XOT(T) {
  return vRT(oj, T);
}
function YOT(T) {
  return jRT(nj, T);
}
function QOT(T) {
  return SRT(lj, T);
}
function ZOT(T) {
  return ORT(Aj, T);
}
function JOT(T) {
  return dRT(pj, T);
}
function TdT(T) {
  return ERT(_j, T);
}
function RdT(T) {
  return CRT(bj, T);
}
function adT(T, R, a = {}) {
  return NS(sm, T, R, a);
}
function edT(T) {
  return NS(sm, "hostname", cm.hostname, T);
}
function tdT(T) {
  return NS(sm, "hex", cm.hex, T);
}
function rdT(T, R) {
  let a = R?.enc ?? "hex",
    e = `${T}_${a}`,
    t = cm[e];
  if (!t) throw Error(`Unrecognized hash format: ${e}`);
  return NS(sm, e, t, R);
}
function b8(T) {
  return tST(hk, T);
}
function mD(T) {
  return hST(WA, T);
}
function hdT(T) {
  return iST(WA, T);
}
function idT(T) {
  return cST(WA, T);
}
function cdT(T) {
  return sST(WA, T);
}
function sdT(T) {
  return oST(WA, T);
}
function Q8(T) {
  return nST(bx, T);
}
function odT(T) {
  return AST(ik, T);
}
function ndT(T) {
  return _ST(US, T);
}
function ldT(T) {
  return bST(US, T);
}
function AdT(T) {
  return mST(g6, T);
}
function pdT(T) {
  return uST($6, T);
}
function Qv(T) {
  return yST(v6, T);
}
function T0T() {
  return PST(j6);
}
function h3() {
  return kST(S6);
}
function x6(T) {
  return xST(O6, T);
}
function _dT(T) {
  return fST(d6, T);
}
function bdT(T) {
  return IST(HS, T);
}
function i0(T, R) {
  return vST(E6, T, R);
}
function mdT(T) {
  let R = T._zod.def.shape;
  return Tt(Object.keys(R));
}
function l0(T, R) {
  let a = {
    type: "object",
    shape: T ?? {},
    ...V9.normalizeParams(R)
  };
  return new mx(a);
}
function udT(T, R) {
  return new mx({
    type: "object",
    shape: T,
    catchall: x6(),
    ...V9.normalizeParams(R)
  });
}
function za(T, R) {
  return new mx({
    type: "object",
    shape: T,
    catchall: h3(),
    ...V9.normalizeParams(R)
  });
}
function X8(T, R) {
  return new PP({
    type: "union",
    options: T,
    ...V9.normalizeParams(R)
  });
}
function ydT(T, R) {
  return new C6({
    type: "union",
    options: T,
    inclusive: !1,
    ...V9.normalizeParams(R)
  });
}
function uD(T, R, a) {
  return new L6({
    type: "union",
    options: R,
    discriminator: T,
    ...V9.normalizeParams(a)
  });
}
function Zv(T, R) {
  return new M6({
    type: "intersection",
    left: T,
    right: R
  });
}
function R0T(T, R, a) {
  let e = R instanceof j9,
    t = e ? a : R;
  return new D6({
    type: "tuple",
    items: T,
    rest: e ? R : null,
    ...V9.normalizeParams(t)
  });
}
function _3(T, R, a) {
  return new ux({
    type: "record",
    keyType: T,
    valueType: R,
    ...V9.normalizeParams(a)
  });
}
function PdT(T, R, a) {
  let e = di(T);
  return e._zod.values = void 0, new ux({
    type: "record",
    keyType: e,
    valueType: R,
    ...V9.normalizeParams(a)
  });
}
function kdT(T, R, a) {
  return new ux({
    type: "record",
    keyType: T,
    valueType: R,
    mode: "loose",
    ...V9.normalizeParams(a)
  });
}
function xdT(T, R, a) {
  return new w6({
    type: "map",
    keyType: T,
    valueType: R,
    ...V9.normalizeParams(a)
  });
}
function fdT(T, R) {
  return new B6({
    type: "set",
    valueType: T,
    ...V9.normalizeParams(R)
  });
}
function Tt(T, R) {
  let a = Array.isArray(T) ? Object.fromEntries(T.map(e => [e, e])) : T;
  return new nb({
    type: "enum",
    entries: a,
    ...V9.normalizeParams(R)
  });
}
function IdT(T, R) {
  return new nb({
    type: "enum",
    entries: T,
    ...V9.normalizeParams(R)
  });
}
function H0(T, R) {
  return new N6({
    type: "literal",
    values: Array.isArray(T) ? T : [T],
    ...V9.normalizeParams(R)
  });
}
function gdT(T) {
  return jST(U6, T);
}
function f6(T) {
  return new H6({
    type: "transform",
    transform: T
  });
}
function g3(T) {
  return new mj({
    type: "optional",
    innerType: T
  });
}
function a0T(T) {
  return new W6({
    type: "optional",
    innerType: T
  });
}
function Jv(T) {
  return new q6({
    type: "nullable",
    innerType: T
  });
}
function $dT(T) {
  return g3(Jv(T));
}
function e0T(T, R) {
  return new z6({
    type: "default",
    innerType: T,
    get defaultValue() {
      return typeof R === "function" ? R() : V9.shallowClone(R);
    }
  });
}
function t0T(T, R) {
  return new F6({
    type: "prefault",
    innerType: T,
    get defaultValue() {
      return typeof R === "function" ? R() : V9.shallowClone(R);
    }
  });
}
function r0T(T, R) {
  return new uj({
    type: "nonoptional",
    innerType: T,
    ...V9.normalizeParams(R)
  });
}
function vdT(T) {
  return new G6({
    type: "success",
    innerType: T
  });
}
function h0T(T, R) {
  return new K6({
    type: "catch",
    innerType: T,
    catchValue: typeof R === "function" ? R : () => R
  });
}
function jdT(T) {
  return $ST(V6, T);
}
function Tj(T, R) {
  return new yj({
    type: "pipe",
    in: T,
    out: R
  });
}
function SdT(T, R, a) {
  return new WS({
    type: "pipe",
    in: T,
    out: R,
    transform: a.decode,
    reverseTransform: a.encode
  });
}
function i0T(T) {
  return new X6({
    type: "readonly",
    innerType: T
  });
}
function OdT(T, R) {
  return new Y6({
    type: "template_literal",
    parts: T,
    ...V9.normalizeParams(R)
  });
}
function c0T(T) {
  return new Q6({
    type: "lazy",
    getter: T
  });
}
function ddT(T) {
  return new Z6({
    type: "promise",
    innerType: T
  });
}
function yD(T) {
  return new J6({
    type: "function",
    input: Array.isArray(T?.input) ? R0T(T?.input) : T?.input ?? i0(h3()),
    output: T?.output ?? h3()
  });
}
function EdT(T) {
  let R = new $3({
    check: "custom"
  });
  return R._zod.check = T, R;
}
function s0T(T, R) {
  return SST(yx, T ?? (() => !0), R);
}
function o0T(T, R = {}) {
  return OST(yx, T, R);
}
function n0T(T) {
  return dST(T);
}
function CdT(T, R = {}) {
  let a = new yx({
    type: "custom",
    check: "custom",
    fn: e => e instanceof T,
    abort: !0,
    ...V9.normalizeParams(R)
  });
  return a._zod.bag.Class = T, a._zod.check = e => {
    if (!(e.value instanceof T)) e.issues.push({
      code: "invalid_type",
      expected: T.name,
      input: e.value,
      inst: a,
      path: [...(a._zod.def.path ?? [])]
    });
  }, a;
}