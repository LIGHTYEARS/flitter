function H8T(T) {
  return LP(T);
}
function W8T(T) {
  if (typeof T === "object") return T;else if (typeof T === "string") return {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: T
      }
    }
  };else throw Error(`Unsupported speechConfig type: ${typeof T}`);
}