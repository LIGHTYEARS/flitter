function qiR() {
  return {
    localeError: ziR()
  };
}
function GiR() {
  return {
    localeError: KiR()
  };
}
function QhT(T, R, a, e) {
  let t = Math.abs(T),
    r = t % 10,
    h = t % 100;
  if (h >= 11 && h <= 19) return e;
  if (r === 1) return R;
  if (r >= 2 && r <= 4) return a;
  return e;
}
function XiR() {
  return {
    localeError: YiR()
  };
}
function ZiR() {
  return {
    localeError: JiR()
  };
}
function RcR() {
  return {
    localeError: acR()
  };
}
function tcR() {
  return {
    localeError: rcR()
  };
}
function icR() {
  return {
    localeError: ccR()
  };
}
function ocR() {
  return {
    localeError: ncR()
  };
}
function FjT() {
  return {
    localeError: AcR()
  };
}
function pcR() {
  return {
    localeError: _cR()
  };
}
function mcR() {
  return {
    localeError: ucR()
  };
}
function PcR() {
  return {
    localeError: kcR()
  };
}
function fcR() {
  return {
    localeError: IcR()
  };
}
function $cR() {
  return {
    localeError: vcR()
  };
}
function ScR() {
  return {
    localeError: OcR()
  };
}
function EcR() {
  return {
    localeError: CcR()
  };
}
function McR() {
  return {
    localeError: DcR()
  };
}
function ZhT(T, R, a) {
  return Math.abs(T) === 1 ? R : a;
}
function uu(T) {
  if (!T) return "";
  let R = ["\u0561", "\u0565", "\u0568", "\u056B", "\u0578", "\u0578\u0582", "\u0585"],
    a = T[T.length - 1];
  return T + (R.includes(a) ? "\u0576" : "\u0568");
}