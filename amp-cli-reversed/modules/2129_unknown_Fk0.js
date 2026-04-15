function Fk0(T) {
  let R = new utT(),
    a = [],
    e = new cT(),
    t,
    r = "",
    h = () => {
      if (r.length > 0) a.push({
        text: r,
        style: e,
        hyperlink: t
      }), r = "";
    };
  if (R.onEvent(c => {
    switch (c.type) {
      case "print":
        r += c.grapheme;
        break;
      case "execute":
        if (c.code === 10) r += `
`;else if (c.code === 9) r += "\t";
        break;
      case "csi":
        if (c.final === "m") h(), e = Gk0(e, c);
        break;
      case "osc":
        {
          let s = Vk0(c.data);
          if (s !== null) h(), t = s;
          break;
        }
      case "escape":
      case "dcs":
        break;
    }
  }), R.parse(T), R.flush(), h(), a.length === 0) return new G("");
  if (a.length === 1) {
    let c = a[0];
    return new G(c.text, c.style, void 0, c.hyperlink);
  }
  let i = a.map(c => new G(c.text, c.style, void 0, c.hyperlink));
  return new G(void 0, void 0, i);
}