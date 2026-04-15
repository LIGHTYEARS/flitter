function nRT() {
  return new oRT();
}
function QjT(T, R) {
  return new T({
    type: "string",
    ...a0(R)
  });
}
function ZjT(T, R) {
  return new T({
    type: "string",
    coerce: !0,
    ...a0(R)
  });
}
function pRT(T, R) {
  return new T({
    type: "string",
    format: "email",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function pD(T, R) {
  return new T({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function _RT(T, R) {
  return new T({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function bRT(T, R) {
  return new T({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v4",
    ...a0(R)
  });
}
function mRT(T, R) {
  return new T({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v6",
    ...a0(R)
  });
}
function uRT(T, R) {
  return new T({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: !1,
    version: "v7",
    ...a0(R)
  });
}
function a6(T, R) {
  return new T({
    type: "string",
    format: "url",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function yRT(T, R) {
  return new T({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function PRT(T, R) {
  return new T({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function kRT(T, R) {
  return new T({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function xRT(T, R) {
  return new T({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function fRT(T, R) {
  return new T({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function IRT(T, R) {
  return new T({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function gRT(T, R) {
  return new T({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function $RT(T, R) {
  return new T({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function vRT(T, R) {
  return new T({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function JjT(T, R) {
  return new T({
    type: "string",
    format: "mac",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function jRT(T, R) {
  return new T({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function SRT(T, R) {
  return new T({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function ORT(T, R) {
  return new T({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function dRT(T, R) {
  return new T({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function ERT(T, R) {
  return new T({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function CRT(T, R) {
  return new T({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: !1,
    ...a0(R)
  });
}
function TST(T, R) {
  return new T({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: !1,
    local: !1,
    precision: null,
    ...a0(R)
  });
}
function RST(T, R) {
  return new T({
    type: "string",
    format: "date",
    check: "string_format",
    ...a0(R)
  });
}
function aST(T, R) {
  return new T({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...a0(R)
  });
}
function eST(T, R) {
  return new T({
    type: "string",
    format: "duration",
    check: "string_format",
    ...a0(R)
  });
}
function tST(T, R) {
  return new T({
    type: "number",
    checks: [],
    ...a0(R)
  });
}
function rST(T, R) {
  return new T({
    type: "number",
    coerce: !0,
    checks: [],
    ...a0(R)
  });
}
function hST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "safeint",
    ...a0(R)
  });
}
function iST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "float32",
    ...a0(R)
  });
}
function cST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "float64",
    ...a0(R)
  });
}
function sST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "int32",
    ...a0(R)
  });
}
function oST(T, R) {
  return new T({
    type: "number",
    check: "number_format",
    abort: !1,
    format: "uint32",
    ...a0(R)
  });
}
function nST(T, R) {
  return new T({
    type: "boolean",
    ...a0(R)
  });
}
function lST(T, R) {
  return new T({
    type: "boolean",
    coerce: !0,
    ...a0(R)
  });
}
function AST(T, R) {
  return new T({
    type: "bigint",
    ...a0(R)
  });
}
function pST(T, R) {
  return new T({
    type: "bigint",
    coerce: !0,
    ...a0(R)
  });
}
function _ST(T, R) {
  return new T({
    type: "bigint",
    check: "bigint_format",
    abort: !1,
    format: "int64",
    ...a0(R)
  });
}
function bST(T, R) {
  return new T({
    type: "bigint",
    check: "bigint_format",
    abort: !1,
    format: "uint64",
    ...a0(R)
  });
}
function mST(T, R) {
  return new T({
    type: "symbol",
    ...a0(R)
  });
}
function uST(T, R) {
  return new T({
    type: "undefined",
    ...a0(R)
  });
}
function yST(T, R) {
  return new T({
    type: "null",
    ...a0(R)
  });
}
function PST(T) {
  return new T({
    type: "any"
  });
}
function kST(T) {
  return new T({
    type: "unknown"
  });
}
function xST(T, R) {
  return new T({
    type: "never",
    ...a0(R)
  });
}
function fST(T, R) {
  return new T({
    type: "void",
    ...a0(R)
  });
}
function IST(T, R) {
  return new T({
    type: "date",
    ...a0(R)
  });
}
function gST(T, R) {
  return new T({
    type: "date",
    coerce: !0,
    ...a0(R)
  });
}
function $ST(T, R) {
  return new T({
    type: "nan",
    ...a0(R)
  });
}
function zl(T, R) {
  return new QB({
    check: "less_than",
    ...a0(R),
    value: T,
    inclusive: !1
  });
}
function ei(T, R) {
  return new QB({
    check: "less_than",
    ...a0(R),
    value: T,
    inclusive: !0
  });
}
function Fl(T, R) {
  return new ZB({
    check: "greater_than",
    ...a0(R),
    value: T,
    inclusive: !1
  });
}
function br(T, R) {
  return new ZB({
    check: "greater_than",
    ...a0(R),
    value: T,
    inclusive: !0
  });
}
function LRT(T) {
  return Fl(0, T);
}
function MRT(T) {
  return zl(0, T);
}
function DRT(T) {
  return ei(0, T);
}
function wRT(T) {
  return br(0, T);
}
function mP(T, R) {
  return new EJ({
    check: "multiple_of",
    ...a0(R),
    value: T
  });
}
function uP(T, R) {
  return new MJ({
    check: "max_size",
    ...a0(R),
    maximum: T
  });
}
function El(T, R) {
  return new DJ({
    check: "min_size",
    ...a0(R),
    minimum: T
  });
}
function Kv(T, R) {
  return new wJ({
    check: "size_equals",
    ...a0(R),
    size: T
  });
}
function Vv(T, R) {
  return new BJ({
    check: "max_length",
    ...a0(R),
    maximum: T
  });
}
function F_(T, R) {
  return new NJ({
    check: "min_length",
    ...a0(R),
    minimum: T
  });
}
function Xv(T, R) {
  return new UJ({
    check: "length_equals",
    ...a0(R),
    length: T
  });
}
function e6(T, R) {
  return new HJ({
    check: "string_format",
    format: "regex",
    ...a0(R),
    pattern: T
  });
}
function t6(T) {
  return new WJ({
    check: "string_format",
    format: "lowercase",
    ...a0(T)
  });
}
function r6(T) {
  return new qJ({
    check: "string_format",
    format: "uppercase",
    ...a0(T)
  });
}
function h6(T, R) {
  return new zJ({
    check: "string_format",
    format: "includes",
    ...a0(R),
    includes: T
  });
}
function i6(T, R) {
  return new FJ({
    check: "string_format",
    format: "starts_with",
    ...a0(R),
    prefix: T
  });
}
function c6(T, R) {
  return new GJ({
    check: "string_format",
    format: "ends_with",
    ...a0(R),
    suffix: T
  });
}
function BRT(T, R, a) {
  return new KJ({
    check: "property",
    property: T,
    schema: R,
    ...a0(a)
  });
}
function s6(T, R) {
  return new VJ({
    check: "mime_type",
    mime: T,
    ...a0(R)
  });
}
function On(T) {
  return new XJ({
    check: "overwrite",
    tx: T
  });
}
function o6(T) {
  return On(R => R.normalize(T));
}
function n6() {
  return On(T => T.trim());
}
function l6() {
  return On(T => T.toLowerCase());
}
function A6() {
  return On(T => T.toUpperCase());
}
function p6() {
  return On(T => qvT(T));
}
function vST(T, R, a) {
  return new T({
    type: "array",
    element: R,
    ...a0(a)
  });
}
function PoR(T, R, a) {
  return new T({
    type: "union",
    options: R,
    ...a0(a)
  });
}
function koR(T, R, a) {
  return new T({
    type: "union",
    options: R,
    inclusive: !1,
    ...a0(a)
  });
}
function xoR(T, R, a, e) {
  return new T({
    type: "union",
    options: a,
    discriminator: R,
    ...a0(e)
  });
}
function foR(T, R, a) {
  return new T({
    type: "intersection",
    left: R,
    right: a
  });
}
function IoR(T, R, a, e) {
  let t = a instanceof j9;
  return new T({
    type: "tuple",
    items: R,
    rest: t ? a : null,
    ...a0(t ? e : a)
  });
}
function goR(T, R, a, e) {
  return new T({
    type: "record",
    keyType: R,
    valueType: a,
    ...a0(e)
  });
}
function $oR(T, R, a, e) {
  return new T({
    type: "map",
    keyType: R,
    valueType: a,
    ...a0(e)
  });
}
function voR(T, R, a) {
  return new T({
    type: "set",
    valueType: R,
    ...a0(a)
  });
}
function joR(T, R, a) {
  let e = Array.isArray(R) ? Object.fromEntries(R.map(t => [t, t])) : R;
  return new T({
    type: "enum",
    entries: e,
    ...a0(a)
  });
}
function SoR(T, R, a) {
  return new T({
    type: "enum",
    entries: R,
    ...a0(a)
  });
}
function OoR(T, R, a) {
  return new T({
    type: "literal",
    values: Array.isArray(R) ? R : [R],
    ...a0(a)
  });
}
function jST(T, R) {
  return new T({
    type: "file",
    ...a0(R)
  });
}
function doR(T, R) {
  return new T({
    type: "transform",
    transform: R
  });
}
function EoR(T, R) {
  return new T({
    type: "optional",
    innerType: R
  });
}
function CoR(T, R) {
  return new T({
    type: "nullable",
    innerType: R
  });
}
function LoR(T, R, a) {
  return new T({
    type: "default",
    innerType: R,
    get defaultValue() {
      return typeof a === "function" ? a() : zvT(a);
    }
  });
}
function MoR(T, R, a) {
  return new T({
    type: "nonoptional",
    innerType: R,
    ...a0(a)
  });
}
function DoR(T, R) {
  return new T({
    type: "success",
    innerType: R
  });
}
function woR(T, R, a) {
  return new T({
    type: "catch",
    innerType: R,
    catchValue: typeof a === "function" ? a : () => a
  });
}
function BoR(T, R, a) {
  return new T({
    type: "pipe",
    in: R,
    out: a
  });
}
function NoR(T, R) {
  return new T({
    type: "readonly",
    innerType: R
  });
}
function UoR(T, R, a) {
  return new T({
    type: "template_literal",
    parts: R,
    ...a0(a)
  });
}
function HoR(T, R) {
  return new T({
    type: "lazy",
    getter: R
  });
}
function WoR(T, R) {
  return new T({
    type: "promise",
    innerType: R
  });
}
function SST(T, R, a) {
  let e = a0(a);
  return e.abort ?? (e.abort = !0), new T({
    type: "custom",
    check: "custom",
    fn: R,
    ...e
  });
}
function OST(T, R, a) {
  return new T({
    type: "custom",
    check: "custom",
    fn: R,
    ...a0(a)
  });
}
function dST(T) {
  let R = EST(a => {
    return a.addIssue = e => {
      if (typeof e === "string") a.issues.push(rD(e, a.value, R._zod.def));else {
        let t = e;
        if (t.fatal) t.continue = !1;
        t.code ?? (t.code = "custom"), t.input ?? (t.input = a.value), t.inst ?? (t.inst = R), t.continue ?? (t.continue = !R._zod.def.abort), a.issues.push(rD(t));
      }
    }, T(a.value, a);
  });
  return R;
}