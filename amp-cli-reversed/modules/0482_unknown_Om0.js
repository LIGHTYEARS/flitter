function Om0(T, R, a) {
  let e = [];
  function t(r, h) {
    if (typeof r === "string") e.push({
      content: r,
      color: h
    });else {
      let i = h ?? vm0(r.type, R);
      if (typeof r.content === "string") e.push({
        content: r.content,
        color: i
      });else if (Array.isArray(r.content)) r.content.forEach(c => t(c, i));else t(r.content, i);
    }
  }
  return T.forEach(r => t(r, a)), e;
}