function DH(T) {
  var R;
  return (R = $f0.get(T)) !== null && R !== void 0 ? R : sT.UNKNOWN;
}
function jf0(T) {
  return T >= HT.DIGIT_0 && T <= HT.DIGIT_9;
}
function I$(T) {
  return T >= HT.LATIN_CAPITAL_A && T <= HT.LATIN_CAPITAL_Z;
}
function Sf0(T) {
  return T >= HT.LATIN_SMALL_A && T <= HT.LATIN_SMALL_Z;
}
function Pl(T) {
  return Sf0(T) || I$(T);
}
function ufT(T) {
  return Pl(T) || jf0(T);
}
function q4(T) {
  return T + 32;
}
function _YT(T) {
  return T === HT.SPACE || T === HT.LINE_FEED || T === HT.TABULATION || T === HT.FORM_FEED;
}
function yfT(T) {
  return _YT(T) || T === HT.SOLIDUS || T === HT.GREATER_THAN_SIGN;
}
function Of0(T) {
  if (T === HT.NULL) return vR.nullCharacterReference;else if (T > 1114111) return vR.characterReferenceOutsideUnicodeRange;else if (cYT(T)) return vR.surrogateCharacterReference;else if (oYT(T)) return vR.noncharacterCharacterReference;else if (sYT(T) || T === HT.CARRIAGE_RETURN) return vR.controlCharacterReference;
  return null;
}