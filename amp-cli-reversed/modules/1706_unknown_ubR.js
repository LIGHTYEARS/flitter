function ubR(T) {
  try {
    let R = new bLT(T.trim()).tokenize();
    return {
      success: !0,
      data: new uLT(R).parseEntry()
    };
  } catch (R) {
    let a = R instanceof Error ? R.message : String(R),
      e = a.match(/line (\d+)/),
      t = a.match(/column (\d+)/);
    return {
      success: !1,
      error: {
        message: a,
        position: 0,
        line: e ? parseInt(e[1]) : 1,
        column: t ? parseInt(t[1]) : 1
      }
    };
  }
}