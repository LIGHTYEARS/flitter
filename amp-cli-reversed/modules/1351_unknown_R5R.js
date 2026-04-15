function vuT(T, R) {
  if (T.length <= R) return T;
  return T.substring(0, R) + `
... (truncated)`;
}
async function R5R(T, R, a, e, t) {
  if (T.length === 0) return "No work was completed before the error occurred.";
  let r = performance.now();
  try {
    let h = JqR(T),
      i = [{
        role: "user",
        parts: [{
          text: Sa`
							The subagent encountered this error: ${R}

							Here is the work log before the error:

							<workLog>
							${h}
							</workLog>
						`
        }]
      }, {
        role: "user",
        parts: [{
          text: ZqR
        }]
      }],
      c = await gO(nU, i, [], a, e, t, {
        responseMimeType: "application/json",
        responseJsonSchema: K.toJSONSchema($uT),
        thinkingConfig: {
          thinkingLevel: "MINIMAL"
        }
      }),
      s = $uT.parse(e5R(c.message.text ?? "")),
      A = performance.now() - r;
    return J.debug("Subagent work summarization completed", {
      threadId: a.id,
      turnCount: T.length,
      summaryLength: s.summary.length,
      durationMs: Math.round(A)
    }), s.summary;
  } catch (h) {
    return J.warn("Failed to summarize subagent work with Gemini, using fallback", {
      error: h
    }), a5R(T);
  }
}