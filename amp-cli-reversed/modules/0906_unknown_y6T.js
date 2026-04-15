class y6T {
  constructor(T, R) {
    this.conn = T, this.apiClient = R;
  }
  async setWeightedPrompts(T) {
    if (!T.weightedPrompts || Object.keys(T.weightedPrompts).length === 0) throw Error("Weighted prompts must be set and contain at least one entry.");
    let R = pjR(T);
    this.conn.send(JSON.stringify({
      clientContent: R
    }));
  }
  async setMusicGenerationConfig(T) {
    if (!T.musicGenerationConfig) T.musicGenerationConfig = {};
    let R = AjR(T);
    this.conn.send(JSON.stringify(R));
  }
  sendPlaybackControl(T) {
    let R = {
      playbackControl: T
    };
    this.conn.send(JSON.stringify(R));
  }
  play() {
    this.sendPlaybackControl(TP.PLAY);
  }
  pause() {
    this.sendPlaybackControl(TP.PAUSE);
  }
  stop() {
    this.sendPlaybackControl(TP.STOP);
  }
  resetContext() {
    this.sendPlaybackControl(TP.RESET_CONTEXT);
  }
  close() {
    this.conn.close();
  }
}