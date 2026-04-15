async function l40(T, R, a) {
  if (T.trim() === "") return {
    summary: "No differences between the selected revisions.",
    fileOrder: []
  };
  let e = [{
      role: "user",
      parts: [{
        text: `${n40}

Diff:
${T}`
      }]
    }],
    t = await R.getLatest(a),
    r = (await gO(nU, e, [], void 0, t, a, {
      temperature: 0.1,
      systemInstruction: "You are an expert software engineer reviewing code changes.",
      thinkingConfig: {
        thinkingLevel: "MINIMAL"
      }
    }, "amp.review")).message.text || "";
  return o40(r);
}