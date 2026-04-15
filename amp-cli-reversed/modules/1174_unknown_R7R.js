function T7R(T) {
  let R = T;
  if (T.startsWith("openrouter/")) R = T.slice(11);
  if (R === "sonoma-sky-alpha") R = "openrouter/sonoma-sky-alpha";
  return R;
}
async function R7R(T, R) {
  let a = T.settings["openrouter.apiKey"];
  if (!a) a = process.env.OPENROUTER_API_KEY;
  if (!a) throw Error("OpenRouter API key not found. Please set amp.openrouter.apiKey setting or OPENROUTER_API_KEY environment variable.");
  return new _9({
    apiKey: a,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      ...Xs(),
      ...(R?.threadID ? {
        [VET]: R.threadID
      } : {}),
      [yc]: "amp.chat"
    }
  });
}