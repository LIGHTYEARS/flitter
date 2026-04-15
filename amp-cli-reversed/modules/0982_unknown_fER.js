async function fER(T, R, a, e, t, r, h) {
  let i = sU(T);
  if (!i.capabilities?.imageGeneration) throw Error(`Model ${i.name} does not support image generation. Use a model with imageGeneration capability.`);
  let c = await oU(t, {
      threadMeta: e,
      featureHeader: h ?? "amp.image-generation"
    }),
    s = a && a.length > 0 ? [{
      text: R
    }, ...a.map(_ => ({
      inlineData: {
        mimeType: _.mimeType,
        data: _.data
      }
    }))] : R,
    A = await c.models.generateContent({
      model: i.name,
      contents: s,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          imageSize: "1K"
        },
        abortSignal: r
      }
    }),
    l = [],
    o;
  for (let _ of A.candidates?.[0]?.content?.parts ?? []) if ("text" in _ && _.text) o = (o ?? "") + _.text;else if ("inlineData" in _ && _.inlineData?.data) l.push({
    mimeType: _.inlineData.mimeType ?? "image/png",
    data: _.inlineData.data
  });
  let n = A.usageMetadata,
    p = {
      model: A.modelVersion ?? i.name,
      maxInputTokens: i.contextWindow - i.maxOutputTokens,
      inputTokens: 0,
      outputTokens: (n?.candidatesTokenCount ?? 0) + (n?.thoughtsTokenCount ?? 0),
      totalInputTokens: n?.promptTokenCount ?? 0,
      cacheCreationInputTokens: (n?.promptTokenCount ?? 0) - (n?.cachedContentTokenCount ?? 0),
      cacheReadInputTokens: n?.cachedContentTokenCount ?? 0,
      timestamp: new Date().toISOString()
    };
  return {
    images: l,
    textResponse: o,
    "~debugUsage": p
  };
}