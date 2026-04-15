function OFR(T) {
  return {
    diffDescription: T.diffDescription,
    instructions: typeof T.instructions === "string" ? T.instructions : void 0,
    files: WuT(T.files),
    checkScope: typeof T.checkScope === "string" ? T.checkScope : void 0,
    checkFilter: WuT(T.checkFilter),
    checksOnly: T.checksOnly === !0,
    thoroughness: T.thoroughness === "quick" ? "quick" : "methodical",
    toolService: T.toolService,
    env: T.env
  };
}