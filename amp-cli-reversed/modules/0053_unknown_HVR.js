async function HVR(T, R, a, e, t, r, h) {
  let i = performance.now(),
    c = [{
      role: "user",
      parts: [{
        text: Sa`
						Here is the mentioned thread content:

						<mentionedThread>
						${T}
						</mentionedThread>
					`
      }]
    }, {
      role: "user",
      parts: [{
        text: UVR.replace("{GOAL}", R)
      }]
    }],
    s = await gO(nU, c, [], e, t, r, {
      responseMimeType: "application/json",
      responseJsonSchema: K.toJSONSchema(RyT)
    }, void 0, h),
    A = RyT.parse(WVR(s.message.text ?? "")),
    l = performance.now() - i;
  return J.debug("Thread mention extraction completed", {
    currentThreadId: e.id,
    mentionedThreadId: a,
    originalLength: T.length,
    extractedLength: A.relevantContent.length,
    compressionRatio: (A.relevantContent.length / T.length).toFixed(2),
    durationMs: Math.round(l)
  }), A.relevantContent;
}