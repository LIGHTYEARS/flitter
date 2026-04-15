async function mUT(T, R, a, e, t, r, h, i, c, s, A) {
  let l = await uUT(r, h, s),
    o = [{
      role: "system",
      content: a
    }, ...T],
    n = {
      model: t,
      messages: o,
      tools: bUT(R),
      temperature: 0.7,
      top_p: 0.95,
      stream: !1,
      ...(c && {
        tool_choice: c
      })
    };
  try {
    return {
      message: await l.chat.completions.create(n, {
        signal: h,
        headers: {
          ...yUT(e, i),
          ...(A ?? {})
        }
      })
    };
  } catch (p) {
    if (xr(p)) throw new DOMException("Aborted", "AbortError");
    throw J.error("xAI API call failed", {
      model: t,
      error: p instanceof Error ? p.message : String(p),
      status: p?.status,
      code: p?.code,
      type: p?.type
    }), J.error("xAI API call failed", {
      model: t,
      error: p instanceof Error ? p.message : String(p),
      params: {
        ...n,
        messages: n.messages.map(_ => ({
          ..._,
          content: typeof _.content === "string" ? _.content.substring(0, 100) + "..." : _.content
        }))
      }
    }), PUT(p);
  }
}