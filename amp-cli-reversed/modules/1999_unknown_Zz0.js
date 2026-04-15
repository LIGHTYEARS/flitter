async function Zz0(T) {
  if (T.streamJsonInput) return {
    userInput: "",
    stdinInput: null
  };
  if (typeof T.execute === "string") {
    let R = (await fS()).trimEnd();
    return {
      userInput: T.execute,
      stdinInput: R || null
    };
  }
  return {
    userInput: (await fS()).trimEnd(),
    stdinInput: null
  };
}