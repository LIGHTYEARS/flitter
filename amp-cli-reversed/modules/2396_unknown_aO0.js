function RO0(T) {
  return T === null || T === void 0 ? "" : String(T);
}
function JfT(T) {
  let R = typeof T === "string" ? T.codePointAt(0) : 0;
  return R === 67 || R === 99 ? 99 : R === 76 || R === 108 ? 108 : R === 82 || R === 114 ? 114 : 0;
}
function aO0() {
  return {
    enter: {
      table: eO0,
      tableData: TIT,
      tableHeader: TIT,
      tableRow: rO0
    },
    exit: {
      codeText: hO0,
      table: tO0,
      tableData: HF,
      tableHeader: HF,
      tableRow: HF
    }
  };
}