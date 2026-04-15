async function* Vl0(T) {
  let R = vl0({
      input: T,
      crlfDelay: Number.POSITIVE_INFINITY
    }),
    a = 0;
  try {
    for await (let e of R) {
      if (a++, e.trim() === "") continue;
      let t;
      try {
        t = JSON.parse(e);
      } catch (i) {
        throw new GR(`Invalid JSON on stdin line ${a}: ${i instanceof Error ? i.message : String(i)}`, 1, `Line content: ${e.slice(0, 100)}${e.length > 100 ? "..." : ""}`);
      }
      let r = Hl0.safeParse(t);
      if (!r.success) {
        let i = r.error.issues.map(c => `${c.path.join(".")}: ${c.message}`).join(", ");
        throw new GR(`Invalid message format on stdin line ${a}: ${i}`, 1, 'Expected format: {"type":"user","message":{"role":"user","content":[{"type":"text","text":"your message"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"..."}}]}}');
      }
      let h = r.data;
      yield {
        contentBlocks: Xl0(h.message.content, a)
      };
    }
  } finally {
    R.close();
  }
}