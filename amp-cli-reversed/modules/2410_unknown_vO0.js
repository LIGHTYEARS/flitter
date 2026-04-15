function vO0() {
  return {
    document: {
      [91]: {
        name: "gfmFootnoteDefinition",
        tokenize: dO0,
        continuation: {
          tokenize: EO0
        },
        exit: CO0
      }
    },
    text: {
      [91]: {
        name: "gfmFootnoteCall",
        tokenize: OO0
      },
      [93]: {
        name: "gfmPotentialFootnoteCall",
        add: "after",
        tokenize: jO0,
        resolveTo: SO0
      }
    }
  };
}