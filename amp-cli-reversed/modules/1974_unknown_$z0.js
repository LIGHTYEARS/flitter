function gz0(T) {
  let R = T?.messages.at(-1);
  return R?.role === "assistant" && R.state.type === "streaming";
}
function $z0(T) {
  let R = T.split(`
`);
  try {
    return R.map(a => {
      let e = a.indexOf(":");
      if (e === -1) return {
        label: "",
        content: a$T(a)
      };
      let t = a.slice(0, e + 1),
        r = a.slice(e + 1);
      return {
        label: t,
        content: a$T(r)
      };
    });
  } catch (a) {
    return R.map(e => ({
      label: "",
      content: [{
        type: "text",
        text: e
      }]
    }));
  }
}