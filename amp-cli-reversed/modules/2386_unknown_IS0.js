function IS0() {
  return {
    unsafe: [{
      character: "@",
      before: "[+\\-.\\w]",
      after: "[\\-.\\w]",
      inConstruct: BF,
      notInConstruct: NF
    }, {
      character: ".",
      before: "[Ww]",
      after: "[\\-.\\w]",
      inConstruct: BF,
      notInConstruct: NF
    }, {
      character: ":",
      before: "[ps]",
      after: "\\/",
      inConstruct: BF,
      notInConstruct: NF
    }]
  };
}