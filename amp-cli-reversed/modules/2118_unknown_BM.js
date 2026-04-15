class BM {
  size;
  capabilities;
  constructor(T, R) {
    this.size = T, this.capabilities = R;
  }
  get supportsEmojiWidth() {
    return this.capabilities.emojiWidth;
  }
  get supportsSyncOutput() {
    return this.capabilities.syncOutput;
  }
}